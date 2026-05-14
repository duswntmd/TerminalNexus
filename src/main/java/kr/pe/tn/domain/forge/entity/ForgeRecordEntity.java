package kr.pe.tn.domain.forge.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 강화 게임 최고 기록 엔티티
 * - 유저당 1개 레코드 (UPSERT 방식)
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "forge_record",
    indexes = { @Index(name = "idx_forge_max_level", columnList = "max_level DESC") }
)
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForgeRecordEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 로그인 username (PK 대용 unique) */
    @Column(name = "username", unique = true, nullable = false, length = 100)
    private String username;

    /** 표시용 닉네임 */
    @Column(name = "nickname", nullable = false, length = 50)
    private String nickname;

    /** 최고 달성 단계 */
    @Column(name = "max_level", nullable = false)
    private int maxLevel;

    /** 최고 달성 시 무기 이름 (예: 전설의 황금 창 +17) */
    @Column(name = "weapon_name", length = 100)
    private String weaponName;

    /** 최고 달성 등급 (일반/희귀/영웅/전설/신화) */
    @Column(name = "grade", length = 20)
    private String grade;

    /** 총 강화 시도 횟수 */
    @Column(name = "total_tries")
    private int totalTries;

    /** 총 성공 횟수 */
    @Column(name = "total_success")
    private int totalSuccess;

    /** 마지막 업데이트 */
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "potential_grade", length = 20)
    private String potentialGrade;

    @Column(name = "potential_options", length = 500)
    private String potentialOptions; // | 로 구분하여 저장

    @Column(name = "potential_atk_bonus")
    private Integer potentialAtkBonus;

    /** 기록 갱신 */
    public void update(int maxLevel, String weaponName, String grade,
                       int totalTries, int totalSuccess, String nickname,
                       String potentialGrade, String potentialOptions, Integer potentialAtkBonus) {
        this.maxLevel = maxLevel;
        this.weaponName = weaponName;
        this.grade = grade;
        this.totalTries = totalTries;
        this.totalSuccess = totalSuccess;
        this.nickname = nickname;
        this.potentialGrade = potentialGrade;
        this.potentialOptions = potentialOptions;
        this.potentialAtkBonus = potentialAtkBonus;
    }
}
