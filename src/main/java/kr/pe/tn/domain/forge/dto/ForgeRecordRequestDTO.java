package kr.pe.tn.domain.forge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 강화 기록 저장 요청 DTO */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForgeRecordRequestDTO {
    private int maxLevel;
    private String weaponName;
    private String grade;
    private int totalTries;
    private int totalSuccess;
    private String potentialGrade;
    private java.util.List<String> potentialOptions;
    private Integer potentialAtkBonus;
}
