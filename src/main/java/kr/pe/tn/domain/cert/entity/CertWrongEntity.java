package kr.pe.tn.domain.cert.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** 오답 기록 (다시 맞히면 resolved) */
@Entity
@Table(name = "cert_wrong", uniqueConstraints = @UniqueConstraint(name = "uk_cert_wrong_user_q", columnNames = {"user_id", "question_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CertWrongEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @Column(name = "question_id", nullable = false, length = 20)
    private String questionId;

    @Column(name = "wrong_count", nullable = false)
    private Integer wrongCount;

    @Column(nullable = false)
    private Boolean resolved;

    @Column(name = "last_wrong_at", nullable = false)
    private LocalDateTime lastWrongAt;

    public CertWrongEntity(UserEntity user, String questionId) {
        this.user = user;
        this.questionId = questionId;
        this.wrongCount = 1;
        this.resolved = false;
        this.lastWrongAt = LocalDateTime.now();
    }

    public void again() {
        this.wrongCount += 1;
        this.resolved = false;
        this.lastWrongAt = LocalDateTime.now();
    }

    public void resolve() {
        this.resolved = true;
    }
}
