package kr.pe.tn.domain.cert.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** 이용권 주문 (금액은 서버가 정한 값만 사용) */
@Entity
@Table(name = "cert_order")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CertOrderEntity {

    public enum Status { READY, PAID, FAILED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "merchant_uid", nullable = false, unique = true, length = 64)
    private String merchantUid;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @Column(name = "plan_id", nullable = false, length = 20)
    private String planId;

    @Column(nullable = false)
    private Integer amount;

    @Column(nullable = false)
    private Integer days;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Status status;

    @Column(name = "imp_uid", length = 64)
    private String impUid;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Builder
    public CertOrderEntity(String merchantUid, UserEntity user, String planId, Integer amount, Integer days) {
        this.merchantUid = merchantUid;
        this.user = user;
        this.planId = planId;
        this.amount = amount;
        this.days = days;
        this.status = Status.READY;
        this.createdAt = LocalDateTime.now();
    }

    public void paid(String impUid) {
        this.status = Status.PAID;
        this.impUid = impUid;
        this.paidAt = LocalDateTime.now();
    }

    public void fail() {
        this.status = Status.FAILED;
    }
}
