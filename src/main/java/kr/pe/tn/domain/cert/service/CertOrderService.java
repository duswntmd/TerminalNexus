package kr.pe.tn.domain.cert.service;

import kr.pe.tn.domain.cert.dto.CertDTO;
import kr.pe.tn.domain.cert.entity.CertOrderEntity;
import kr.pe.tn.domain.cert.entity.CertPassEntity;
import kr.pe.tn.domain.cert.repository.CertOrderRepository;
import kr.pe.tn.domain.cert.repository.CertPassRepository;
import kr.pe.tn.domain.donation.dto.PortOneDTO;
import kr.pe.tn.domain.donation.service.PortOneClient;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/** 이용권 결제 (금액은 서버의 요금표만 사용하고, 지급 전 포트원 실제 결제 내역과 대조) */
@Slf4j
@Service
@RequiredArgsConstructor
public class CertOrderService {

    private final CertOrderRepository orderRepository;
    private final CertPassRepository passRepository;
    private final PortOneClient portOne;

    @Value("${cert.payment.enabled:false}")
    private boolean paymentEnabled;

    @Transactional
    public CertDTO.OrderResponse prepare(UserEntity user, String planId) {
        if (!paymentEnabled) {
            throw new IllegalStateException("결제는 아직 준비 중입니다.");
        }
        CertDTO.Plan plan = CertService.PLANS.stream().filter(p -> p.id().equals(planId)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("없는 요금제입니다."));
        String merchantUid = "cert_" + UUID.randomUUID().toString().replace("-", "");
        orderRepository.save(CertOrderEntity.builder().merchantUid(merchantUid).user(user)
                .planId(plan.id()).amount(plan.amount()).days(plan.days()).build());
        return new CertDTO.OrderResponse(merchantUid, "리눅스 자격증 " + plan.name(), plan.amount());
    }

    /** 결제창 완료 후 화면에서 호출 */
    @Transactional(noRollbackFor = IllegalStateException.class)
    public String verify(UserEntity user, String merchantUid) {
        CertOrderEntity order = orderRepository.findByMerchantUidForUpdate(merchantUid)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다."));
        if (!order.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("주문을 찾을 수 없습니다.");
        }
        return confirm(order);
    }

    /** 포트원 웹훅: 화면이 닫혀 검증이 빠진 결제도 지급. 본문은 믿지 않고 포트원에 다시 조회 */
    @Transactional(noRollbackFor = IllegalStateException.class)
    public void webhook(String merchantUid) {
        if (merchantUid == null) return;
        CertOrderEntity order = orderRepository.findByMerchantUidForUpdate(merchantUid).orElse(null);
        if (order == null || order.getStatus() != CertOrderEntity.Status.READY) return;
        confirm(order);
    }

    private String confirm(CertOrderEntity order) {
        if (order.getStatus() == CertOrderEntity.Status.PAID) {
            return expiresOf(order); // 이미 지급됨: 다시 지급하지 않음
        }
        if (order.getStatus() == CertOrderEntity.Status.FAILED) {
            throw new IllegalStateException("처리할 수 없는 주문입니다.");
        }
        PortOneDTO.PaymentResponse.PaymentData payment = portOne.findPayment(order.getMerchantUid());
        if (payment == null || !"paid".equals(payment.getStatus())) {
            // 결제 대기(가상계좌 등)일 수 있어 주문을 실패로 닫지 않음
            throw new IllegalStateException("결제가 완료되지 않았습니다.");
        }
        if (payment.getAmount() != order.getAmount()) {
            order.fail();
            log.warn("이용권 결제 금액 불일치: 주문 {}원, 실제 {}원, {}", order.getAmount(), payment.getAmount(), order.getMerchantUid());
            throw new IllegalStateException("결제 금액이 주문과 다릅니다.");
        }
        order.paid(payment.getImp_uid());

        Long userId = order.getUser().getId();
        CertPassEntity pass = passRepository.findById(userId).orElse(null);
        if (pass == null) {
            passRepository.save(new CertPassEntity(userId, LocalDateTime.now().plusDays(order.getDays())));
        } else {
            pass.extend(order.getDays());
        }
        log.info("이용권 지급: user={}, {}일, {}", userId, order.getDays(), order.getMerchantUid());
        return expiresOf(order);
    }

    private String expiresOf(CertOrderEntity order) {
        return passRepository.findById(order.getUser().getId()).map(p -> p.getExpiresAt().toString()).orElse(null);
    }
}
