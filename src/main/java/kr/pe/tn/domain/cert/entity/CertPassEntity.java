package kr.pe.tn.domain.cert.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** 이용권 (사용자당 1행, 결제할 때마다 기간 연장) */
@Entity
@Table(name = "cert_pass")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CertPassEntity {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    public CertPassEntity(Long userId, LocalDateTime expiresAt) {
        this.userId = userId;
        this.expiresAt = expiresAt;
    }

    /** 남은 기간이 있으면 그 뒤로 이어서 연장 */
    public void extend(int days) {
        LocalDateTime now = LocalDateTime.now();
        this.expiresAt = (expiresAt.isAfter(now) ? expiresAt : now).plusDays(days);
    }
}
