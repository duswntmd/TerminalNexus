package kr.pe.tn.domain.forge.dto;

import kr.pe.tn.domain.forge.entity.ForgeRecordEntity;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/** 강화 기록 응답 DTO (랭킹 표시용) */
@Getter
@Builder
public class ForgeRecordResponseDTO {

    private Long id;
    private String nickname;
    private int maxLevel;
    private String weaponName;
    private String grade;
    private int totalTries;
    private int totalSuccess;
    private String potentialGrade;
    private java.util.List<String> potentialOptions;
    private Integer potentialAtkBonus;
    private LocalDateTime updatedAt;

    public ForgeRecordResponseDTO() {}

    public ForgeRecordResponseDTO(Long id, String nickname, int maxLevel, String weaponName, String grade, int totalTries, int totalSuccess, String potentialGrade, java.util.List<String> potentialOptions, Integer potentialAtkBonus, LocalDateTime updatedAt) {
        this.id = id;
        this.nickname = nickname;
        this.maxLevel = maxLevel;
        this.weaponName = weaponName;
        this.grade = grade;
        this.totalTries = totalTries;
        this.totalSuccess = totalSuccess;
        this.potentialGrade = potentialGrade;
        this.potentialOptions = potentialOptions;
        this.potentialAtkBonus = potentialAtkBonus;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public String getNickname() { return nickname; }
    public int getMaxLevel() { return maxLevel; }
    public String getWeaponName() { return weaponName; }
    public String getGrade() { return grade; }
    public int getTotalTries() { return totalTries; }
    public int getTotalSuccess() { return totalSuccess; }
    public String getPotentialGrade() { return potentialGrade; }
    public java.util.List<String> getPotentialOptions() { return potentialOptions; }
    public Integer getPotentialAtkBonus() { return potentialAtkBonus; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public static ForgeRecordResponseDTO from(ForgeRecordEntity entity) {
        java.util.List<String> opts = null;
        if (entity.getPotentialOptions() != null && !entity.getPotentialOptions().isEmpty()) {
            opts = java.util.Arrays.asList(entity.getPotentialOptions().split("\\|"));
        }

        return ForgeRecordResponseDTO.builder()
                .id(entity.getId())
                .nickname(entity.getNickname())
                .maxLevel(entity.getMaxLevel())
                .weaponName(entity.getWeaponName())
                .grade(entity.getGrade())
                .totalTries(entity.getTotalTries())
                .totalSuccess(entity.getTotalSuccess())
                .potentialGrade(entity.getPotentialGrade())
                .potentialOptions(opts)
                .potentialAtkBonus(entity.getPotentialAtkBonus())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public static ForgeRecordResponseDTOBuilder builder() { return new ForgeRecordResponseDTOBuilder(); }

    public static class ForgeRecordResponseDTOBuilder {
        private Long id;
        private String nickname;
        private int maxLevel;
        private String weaponName;
        private String grade;
        private int totalTries;
        private int totalSuccess;
        private String potentialGrade;
        private java.util.List<String> potentialOptions;
        private Integer potentialAtkBonus;
        private LocalDateTime updatedAt;

        public ForgeRecordResponseDTOBuilder id(Long id) { this.id = id; return this; }
        public ForgeRecordResponseDTOBuilder nickname(String nickname) { this.nickname = nickname; return this; }
        public ForgeRecordResponseDTOBuilder maxLevel(int maxLevel) { this.maxLevel = maxLevel; return this; }
        public ForgeRecordResponseDTOBuilder weaponName(String weaponName) { this.weaponName = weaponName; return this; }
        public ForgeRecordResponseDTOBuilder grade(String grade) { this.grade = grade; return this; }
        public ForgeRecordResponseDTOBuilder totalTries(int totalTries) { this.totalTries = totalTries; return this; }
        public ForgeRecordResponseDTOBuilder totalSuccess(int totalSuccess) { this.totalSuccess = totalSuccess; return this; }
        public ForgeRecordResponseDTOBuilder potentialGrade(String potentialGrade) { this.potentialGrade = potentialGrade; return this; }
        public ForgeRecordResponseDTOBuilder potentialOptions(java.util.List<String> potentialOptions) { this.potentialOptions = potentialOptions; return this; }
        public ForgeRecordResponseDTOBuilder potentialAtkBonus(Integer potentialAtkBonus) { this.potentialAtkBonus = potentialAtkBonus; return this; }
        public ForgeRecordResponseDTOBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public ForgeRecordResponseDTO build() {
            ForgeRecordResponseDTO r = new ForgeRecordResponseDTO();
            r.id = this.id;
            r.nickname = this.nickname;
            r.maxLevel = this.maxLevel;
            r.weaponName = this.weaponName;
            r.grade = this.grade;
            r.totalTries = this.totalTries;
            r.totalSuccess = this.totalSuccess;
            r.potentialGrade = this.potentialGrade;
            r.potentialOptions = this.potentialOptions;
            r.potentialAtkBonus = this.potentialAtkBonus;
            r.updatedAt = this.updatedAt;
            return r;
        }
    }
}
