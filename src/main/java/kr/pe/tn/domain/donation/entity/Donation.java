package kr.pe.tn.domain.donation.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "donation")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Donation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 포트원 결제 고유번호 (결제 완료 후 채워짐)
     * 형식: imp_XXXXXXXXXX
     */
    @Column(name = "imp_uid", length = 100)
    private String impUid;

    /**
     * 가맹점 주문 고유번호 (프론트에서 생성, 사전 등록 시 저장)
     * 형식: donation_TIMESTAMP_RANDOM
     */
    @Column(name = "merchant_uid", length = 100, unique = true, nullable = false)
    private String merchantUid;

    /** 후원 금액 */
    @Column(name = "amount", nullable = false)
    private Integer amount;

    /** 결제 수단 (card, kakaopay, naverpay 등 - 포트원에서 반환) */
    @Column(name = "pay_method", length = 50)
    private String payMethod;

    /** PG사 (html5_inicis, kakaopay 등 - 포트원에서 반환) */
    @Column(name = "pg_provider", length = 50)
    private String pgProvider;

    /** 결제 상태 */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private DonationStatus status = DonationStatus.READY;

    /** 후원자 (로그인 유저) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    /** 후원 메시지 */
    @Column(name = "message", length = 500)
    private String message;

    @CreatedDate
    @Column(name = "created_date", updatable = false)
    private LocalDateTime createdDate;

    @Column(name = "paid_date")
    private LocalDateTime paidDate;

    // ──────────────────────────────────────────────────
    // 비즈니스 메서드
    // ──────────────────────────────────────────────────

    /**
     * 결제 승인 완료 처리
     * - 포트원 서버 검증 후 최종 상태 업데이트
     */
    public void approve(String impUid, String payMethod, String pgProvider) {
        this.impUid = impUid;
        this.payMethod = payMethod;
        this.pgProvider = pgProvider;
        this.status = DonationStatus.PAID;
        this.paidDate = LocalDateTime.now();
    }

    /**
     * 결제 실패 처리
     */
    public void fail() {
        this.status = DonationStatus.FAILED;
    }
}
