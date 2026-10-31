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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class DonationService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DonationService.class);
    private final DonationRepository donationRepository;
    private final UserRepository userRepository;
    private final PortOneClient portOneClient;

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
     * 1. 주문번호로 포트원 실제 결제 정보 조회
     * 2. DB에 저장된 금액 vs 포트원 실제 결제 금액 비교 (핵심!)
     * 3. 일치 시 PAID 상태로 업데이트
     *
     * noRollbackFor: 검증 실패 시 예외를 던져도 FAILED 상태 기록은 DB에 남김
     */
    @Transactional(noRollbackFor = Exception.class)
    public DonationDTO.Response verify(DonationDTO.VerifyRequest request) {
        // DB에서 사전 등록된 결제 정보 조회
        Donation donation = donationRepository.findByMerchantUid(request.getMerchantUid())
                .orElseThrow(() -> new NoSuchElementException("결제 정보를 찾을 수 없습니다."));

        // 이미 처리된 결제인지 확인 (중복 검증 방지)
        if (donation.getStatus() != DonationStatus.READY) {
            throw new IllegalStateException("이미 처리된 결제입니다.");
        }

        try {
            // 1. merchantUid로 실제 결제 정보 조회 (PortOne imp_uid 조회 버그/지연 우회)
            PortOneDTO.PaymentResponse.PaymentData paymentData = portOneClient.findPayment(request.getMerchantUid());

            // 2. 핵심: 금액 위변조 검증 (DB 저장 금액 vs 포트원 실제 결제 금액)
            if (donation.getAmount() != paymentData.getAmount()) {
                donation.fail();
                log.warn("결제 금액 불일치! DB: {}원, 포트원: {}원, merchantUid: {}",
                        donation.getAmount(), paymentData.getAmount(), request.getMerchantUid());
                throw new IllegalStateException(
                        String.format("결제 금액 불일치: 요청 %d원, 실제 결제 %d원",
                                donation.getAmount(), paymentData.getAmount()));
            }

            // 3. 결제 상태 검증 (포트원에서 paid 상태인지 확인)
            if (!"paid".equals(paymentData.getStatus())) {
                donation.fail();
                throw new IllegalStateException("결제가 완료되지 않았습니다. 상태: " + paymentData.getStatus());
            }

            // 4. 최종 승인 처리
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
}
