package kr.pe.tn.domain.donation.service;

import kr.pe.tn.domain.donation.dto.DonationDTO;
import kr.pe.tn.domain.donation.dto.PortOneDTO;
import kr.pe.tn.domain.donation.entity.Donation;
import kr.pe.tn.domain.donation.entity.DonationStatus;
import kr.pe.tn.domain.donation.repository.DonationRepository;
import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class DonationService {

    @Value("${portone.imp_key}")
    private String impKey;

    @Value("${portone.imp_secret}")
    private String impSecret;

    private static final String PORTONE_TOKEN_URL = "https://api.iamport.kr/users/getToken";
    private static final String PORTONE_PAYMENT_URL = "https://api.iamport.kr/payments/find/";

    private final DonationRepository donationRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    // ─── Step 1: 사전 결제 등록 ────────────────────────────────────────────────
    /**
     * 포트원 결제창 호출 전, DB에 READY 상태로 먼저 저장
     * → 나중에 결제 완료 후 금액 위변조 여부를 검증할 때 기준값으로 사용
     */
    public DonationDTO.Response prepare(DonationDTO.PrepareRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserEntity user = userRepository.findByUsernameAndIsLock(username, false)
                .orElseThrow(() -> new NoSuchElementException("로그인된 유저를 찾을 수 없습니다."));

        // 금액 유효성 검사 (최소 100원 ~ 최대 100만원)
        if (request.getAmount() < 100 || request.getAmount() > 1_000_000) {
            throw new IllegalArgumentException("후원 금액은 100원 이상 100만원 이하여야 합니다.");
        }

        Donation donation = Donation.builder()
                .merchantUid(request.getMerchantUid())
                .amount(request.getAmount())
                .message(request.getMessage())
                .user(user)
                .build();

        return DonationDTO.Response.from(donationRepository.save(donation));
    }

    // ─── Step 2: 결제 검증 및 승인 ─────────────────────────────────────────────
    /**
     * 포트원 결제 완료 후 위변조 검증
     *
     * 검증 흐름:
     * 1. 포트원 서버에서 액세스 토큰 발급
     * 2. imp_uid로 실제 결제 정보 조회
     * 3. DB에 저장된 금액 vs 포트원 실제 결제 금액 비교 (핵심!)
     * 4. 일치 시 PAID 상태로 업데이트
     */
    public DonationDTO.Response verify(DonationDTO.VerifyRequest request) {
        // DB에서 사전 등록된 결제 정보 조회
        Donation donation = donationRepository.findByMerchantUid(request.getMerchantUid())
                .orElseThrow(() -> new NoSuchElementException("결제 정보를 찾을 수 없습니다."));

        // 이미 처리된 결제인지 확인 (중복 검증 방지)
        if (donation.getStatus() != DonationStatus.READY) {
            throw new IllegalStateException("이미 처리된 결제입니다.");
        }

        try {
            // 1. 포트원 액세스 토큰 발급
            String accessToken = getPortOneAccessToken();

            // 2. merchantUid로 실제 결제 정보 조회 (PortOne imp_uid 조회 버그/지연 우회)
            PortOneDTO.PaymentResponse.PaymentData paymentData = getPortOnePaymentData(request.getMerchantUid(),
                    accessToken);

            // 3. 핵심: 금액 위변조 검증 (DB 저장 금액 vs 포트원 실제 결제 금액)
            if (donation.getAmount() != paymentData.getAmount()) {
                donation.fail();
                log.warn("결제 금액 불일치! DB: {}원, 포트원: {}원, merchantUid: {}",
                        donation.getAmount(), paymentData.getAmount(), request.getMerchantUid());
                throw new IllegalStateException(
                        String.format("결제 금액 불일치: 요청 %d원, 실제 결제 %d원",
                                donation.getAmount(), paymentData.getAmount()));
            }

            // 4. 결제 상태 검증 (포트원에서 paid 상태인지 확인)
            if (!"paid".equals(paymentData.getStatus())) {
                donation.fail();
                throw new IllegalStateException("결제가 완료되지 않았습니다. 상태: " + paymentData.getStatus());
            }

            // 5. 최종 승인 처리
            donation.approve(
                    paymentData.getImp_uid(),
                    paymentData.getPay_method(),
                    paymentData.getPg_provider());

            log.info("후원 결제 완료! merchantUid: {}, amount: {}원, payMethod: {}",
                    donation.getMerchantUid(), donation.getAmount(), donation.getPayMethod());

            return DonationDTO.Response.from(donation);

        } catch (IllegalStateException e) {
            throw e; // 비즈니스 예외 그대로 전파
        } catch (Exception e) {
            donation.fail();
            log.error("포트원 결제 검증 중 오류 발생: {}", e.getMessage(), e);
            throw new RuntimeException("결제 검증 오류: " + e.getMessage());
        }
    }

    // ─── 내 후원 내역 조회 ──────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<DonationDTO.Response> getMyHistory() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserEntity user = userRepository.findByUsernameAndIsLock(username, false)
                .orElseThrow(() -> new NoSuchElementException("로그인된 유저를 찾을 수 없습니다."));

        return donationRepository.findByUserOrderByCreatedDateDesc(user)
                .stream()
                .map(DonationDTO.Response::from)
                .collect(Collectors.toList());
    }

    // ─── 전체 후원 현황 (공개) ──────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<DonationDTO.Response> getPublicHistory() {
        return donationRepository.findByStatusOrderByPaidDateDesc(DonationStatus.PAID)
                .stream()
                .map(DonationDTO.Response::from)
                .collect(Collectors.toList());
    }

    // ─── 포트원 내부 유틸 메서드 ────────────────────────────────────────────────

    /**
     * 포트원 액세스 토큰 발급
     * imp_key + imp_secret → access_token
     */
    private String getPortOneAccessToken() {
        Map<String, String> body = new HashMap<>();
        body.put("imp_key", impKey);
        body.put("imp_secret", impSecret);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

        ResponseEntity<PortOneDTO.TokenResponse> response = restTemplate.postForEntity(PORTONE_TOKEN_URL, entity,
                PortOneDTO.TokenResponse.class);

        PortOneDTO.TokenResponse tokenResponse = response.getBody();
        if (tokenResponse == null || tokenResponse.getCode() != 0) {
            throw new RuntimeException("포트원 토큰 발급에 실패했습니다.");
        }

        return tokenResponse.getResponse().getAccess_token();
    }

    /**
     * imp_uid로 포트원 서버에서 실제 결제 내역 조회
     */
    private PortOneDTO.PaymentResponse.PaymentData getPortOnePaymentData(
            String impUid, String accessToken) {

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<PortOneDTO.PaymentResponse> response = restTemplate.exchange(
                PORTONE_PAYMENT_URL + impUid,
                HttpMethod.GET,
                entity,
                PortOneDTO.PaymentResponse.class);

        PortOneDTO.PaymentResponse paymentResponse = response.getBody();
        if (paymentResponse == null || paymentResponse.getCode() != 0) {
            throw new RuntimeException("포트원에서 결제 정보를 조회할 수 없습니다.");
        }

        return paymentResponse.getResponse();
    }
}
