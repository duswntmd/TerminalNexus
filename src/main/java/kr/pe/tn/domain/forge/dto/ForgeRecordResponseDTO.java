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
}
