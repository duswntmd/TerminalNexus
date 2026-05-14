package kr.pe.tn.domain.forge.service;

import kr.pe.tn.domain.forge.dto.ForgeRecordRequestDTO;
import kr.pe.tn.domain.forge.dto.ForgeRecordResponseDTO;
import kr.pe.tn.domain.forge.entity.ForgeRecordEntity;
import kr.pe.tn.domain.forge.repository.ForgeRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ForgeRecordService {

    private final ForgeRecordRepository forgeRecordRepository;

    /**
     * 강화 기록 저장/갱신 (UPSERT)
     * - 기존 기록이 없으면 INSERT
     * - 새 maxLevel이 더 높으면 UPDATE
     */
    @Transactional
    public ForgeRecordResponseDTO saveRecord(String username, String nickname,
                                              ForgeRecordRequestDTO dto) {
        Optional<ForgeRecordEntity> existing = forgeRecordRepository.findByUsername(username);

        String optsStr = dto.getPotentialOptions() != null ? String.join("|", dto.getPotentialOptions()) : null;

        if (existing.isPresent()) {
            ForgeRecordEntity entity = existing.get();
            // 항상 최신 플레이 데이터로 갱신 (최고기록만 유지)
            if (dto.getMaxLevel() >= entity.getMaxLevel()) {
                entity.update(dto.getMaxLevel(), dto.getWeaponName(), dto.getGrade(),
                        dto.getTotalTries(), dto.getTotalSuccess(), nickname,
                        dto.getPotentialGrade(), optsStr, dto.getPotentialAtkBonus());
            } else {
                // 최고기록은 유지하되 시도/성공 통계는 갱신
                entity.update(entity.getMaxLevel(), entity.getWeaponName(), entity.getGrade(),
                        dto.getTotalTries(), dto.getTotalSuccess(), nickname,
                        entity.getPotentialGrade(), entity.getPotentialOptions(), entity.getPotentialAtkBonus());
            }
            log.info("[FORGE] 기록 갱신: {} → +{}", username, entity.getMaxLevel());
            return ForgeRecordResponseDTO.from(entity);
        } else {
            ForgeRecordEntity entity = ForgeRecordEntity.builder()
                    .username(username)
                    .nickname(nickname)
                    .maxLevel(dto.getMaxLevel())
                    .weaponName(dto.getWeaponName())
                    .grade(dto.getGrade())
                    .totalTries(dto.getTotalTries())
                    .totalSuccess(dto.getTotalSuccess())
                    .potentialGrade(dto.getPotentialGrade())
                    .potentialOptions(optsStr)
                    .potentialAtkBonus(dto.getPotentialAtkBonus())
                    .build();
            forgeRecordRepository.save(entity);
            log.info("[FORGE] 기록 최초 저장: {} → +{}", username, dto.getMaxLevel());
            return ForgeRecordResponseDTO.from(entity);
        }
    }

    /** 상위 20명 랭킹 조회 */
    @Transactional(readOnly = true)
    public List<ForgeRecordResponseDTO> getLeaderboard() {
        return forgeRecordRepository.findTop20ByOrderByMaxLevelDesc()
                .stream()
                .map(ForgeRecordResponseDTO::from)
                .collect(Collectors.toList());
    }

    /** 내 기록 조회 */
    @Transactional(readOnly = true)
    public ForgeRecordResponseDTO getMyRecord(String username) {
        return forgeRecordRepository.findByUsername(username)
                .map(ForgeRecordResponseDTO::from)
                .orElse(null);
    }
}
