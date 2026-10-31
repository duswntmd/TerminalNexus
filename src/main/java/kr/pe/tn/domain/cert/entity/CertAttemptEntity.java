package kr.pe.tn.domain.cert.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** 모의고사 응시 기록 */
@Entity
@Table(name = "cert_attempt", indexes = @Index(name = "idx_cert_attempt_user", columnList = "user_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CertAttemptEntity {

    public enum Mode { TRIAL, FULL }

    public enum Status { IN_PROGRESS, DONE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Mode mode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Status status;

    /** 출제 문제 id, 쉼표 구분 */
    @Column(name = "question_ids", nullable = false, columnDefinition = "TEXT")
    private String questionIds;

    /** 제출 답안 JSON {문제id: 보기번호} */
    @Column(columnDefinition = "TEXT")
    private String answers;

    private Integer score;

    private Integer correct;

    private Boolean passed;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "ends_at", nullable = false)
    private LocalDateTime endsAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Builder
    public CertAttemptEntity(UserEntity user, Mode mode, String questionIds, LocalDateTime endsAt) {
        this.user = user;
        this.mode = mode;
        this.status = Status.IN_PROGRESS;
        this.questionIds = questionIds;
        this.startedAt = LocalDateTime.now();
        this.endsAt = endsAt;
    }

    public void finish(String answers, int score, int correct, boolean passed) {
        this.status = Status.DONE;
        this.answers = answers;
        this.score = score;
        this.correct = correct;
        this.passed = passed;
        this.submittedAt = LocalDateTime.now();
    }
}
