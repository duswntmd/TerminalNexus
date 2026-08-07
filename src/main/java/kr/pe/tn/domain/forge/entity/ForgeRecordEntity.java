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

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getNickname() { return nickname; }
    public int getMaxLevel() { return maxLevel; }
    public String getWeaponName() { return weaponName; }
    public String getGrade() { return grade; }
    public int getTotalTries() { return totalTries; }
    public int getTotalSuccess() { return totalSuccess; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    @Column(name = "potential_grade", length = 20)
    private String potentialGrade;

    @Column(name = "potential_options", length = 500)
    private String potentialOptions; // | 로 구분하여 저장

    @Column(name = "potential_atk_bonus")
    private Integer potentialAtkBonus;

    public String getPotentialGrade() { return potentialGrade; }
    public String getPotentialOptions() { return potentialOptions; }
    public Integer getPotentialAtkBonus() { return potentialAtkBonus; }

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

    public static ForgeRecordEntityBuilder builder() {
        return new ForgeRecordEntityBuilder();
    }

    public static class ForgeRecordEntityBuilder {
        private String username;
        private String nickname;
        private int maxLevel;
        private String weaponName;
        private String grade;
        private int totalTries;
        private int totalSuccess;
        private String potentialGrade;
        private String potentialOptions;
        private Integer potentialAtkBonus;

        public ForgeRecordEntityBuilder username(String username) { this.username = username; return this; }
        public ForgeRecordEntityBuilder nickname(String nickname) { this.nickname = nickname; return this; }
        public ForgeRecordEntityBuilder maxLevel(int maxLevel) { this.maxLevel = maxLevel; return this; }
        public ForgeRecordEntityBuilder weaponName(String weaponName) { this.weaponName = weaponName; return this; }
        public ForgeRecordEntityBuilder grade(String grade) { this.grade = grade; return this; }
        public ForgeRecordEntityBuilder totalTries(int totalTries) { this.totalTries = totalTries; return this; }
        public ForgeRecordEntityBuilder totalSuccess(int totalSuccess) { this.totalSuccess = totalSuccess; return this; }
        public ForgeRecordEntityBuilder potentialGrade(String potentialGrade) { this.potentialGrade = potentialGrade; return this; }
        public ForgeRecordEntityBuilder potentialOptions(String potentialOptions) { this.potentialOptions = potentialOptions; return this; }
        public ForgeRecordEntityBuilder potentialAtkBonus(Integer potentialAtkBonus) { this.potentialAtkBonus = potentialAtkBonus; return this; }

        public ForgeRecordEntity build() {
            ForgeRecordEntity e = new ForgeRecordEntity();
            e.username = this.username;
            e.nickname = this.nickname;
            e.maxLevel = this.maxLevel;
            e.weaponName = this.weaponName;
            e.grade = this.grade;
            e.totalTries = this.totalTries;
            e.totalSuccess = this.totalSuccess;
            e.potentialGrade = this.potentialGrade;
            e.potentialOptions = this.potentialOptions;
            e.potentialAtkBonus = this.potentialAtkBonus;
            return e;
        }
    }
}
