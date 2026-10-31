package kr.pe.tn.domain.lotto.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** 새 회차 결과 알림 (사용자·회차당 1건) */
@Entity
@Table(name = "lotto_alert", uniqueConstraints = @UniqueConstraint(name = "uk_lotto_alert_user_draw", columnNames = {"user_id", "drw_no"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LottoAlertEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @Column(name = "drw_no", nullable = false)
    private Long drwNo;

    /** 가장 높은 등수 (1~5, 낙첨이면 0) */
    @Column(name = "best_rank", nullable = false)
    private Integer bestRank;

    /** 5등 이상 당첨된 게임 수 */
    @Column(name = "win_count", nullable = false)
    private Integer winCount;

    @Column(name = "ticket_count", nullable = false)
    private Integer ticketCount;

    @Column(name = "is_read", nullable = false)
    private Boolean read;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Builder
    public LottoAlertEntity(UserEntity user, Long drwNo, Integer bestRank, Integer winCount, Integer ticketCount) {
        this.user = user;
        this.drwNo = drwNo;
        this.bestRank = bestRank;
        this.winCount = winCount;
        this.ticketCount = ticketCount;
        this.read = false;
        this.createdAt = LocalDateTime.now();
    }
}
