package kr.pe.tn.domain.typeracer.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "typeracer_record",
    indexes = {
        @Index(name = "idx_typeracer_wpm", columnList = "wpm DESC, accuracy DESC")
    }
)
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TypeRacerRecordEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private UserEntity user;

    @Column(name = "wpm", nullable = false)
    private Integer wpm;

    @Column(name = "accuracy", nullable = false)
    private Double accuracy;

    @Column(name = "nickname", nullable = false)
    private String nickname;

    @LastModifiedDate
    @Column(name = "updated_date")
    private LocalDateTime updatedDate;

    /**
     * 최고 기록 갱신 메서드
     * @param wpm 분당 타수
     * @param accuracy 정확도
     * @param nickname 갱신 시점의 유저 닉네임
     */
    public void updateRecord(Integer wpm, Double accuracy, String nickname) {
        this.wpm = wpm;
        this.accuracy = accuracy;
        this.nickname = nickname;
        this.updatedDate = LocalDateTime.now();
    }
}
