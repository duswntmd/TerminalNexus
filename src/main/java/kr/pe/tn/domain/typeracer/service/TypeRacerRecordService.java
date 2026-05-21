package kr.pe.tn.domain.typeracer.service;

import kr.pe.tn.domain.typeracer.dto.TypeRacerRequestDTO;
import kr.pe.tn.domain.typeracer.dto.TypeRacerResponseDTO;
import kr.pe.tn.domain.typeracer.entity.TypeRacerRecordEntity;
import kr.pe.tn.domain.typeracer.repository.TypeRacerRecordRepository;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TypeRacerRecordService {

    private final TypeRacerRecordRepository typeRacerRecordRepository;

    /**
     * 사용자의 타자 최고 기록을 등록 또는 갱신 (UPSERT)
     * @param user 현재 로그인된 사용자
     * @param dto 타수 및 정확도 요청 데이터
     * @return 갱신 성공 여부 (최고 점수 갱신 시 true, 그렇지 않으면 false)
     */
    @Transactional
    public boolean saveOrUpdateRecord(UserEntity user, TypeRacerRequestDTO dto) {
        if (user == null) {
            throw new IllegalArgumentException("로그인된 사용자 정보가 존재하지 않습니다.");
        }

        // 사용자의 닉네임이 설정되어 있지 않은 경우 username을 기본값으로 사용
        String activeNickname = (user.getNickname() != null && !user.getNickname().isBlank()) 
                ? user.getNickname() 
                : user.getUsername();

        Optional<TypeRacerRecordEntity> optionalRecord = typeRacerRecordRepository.findByUser(user);

        if (optionalRecord.isEmpty()) {
            // 첫 번째 기록 등록인 경우 무조건 저장
            TypeRacerRecordEntity newRecord = TypeRacerRecordEntity.builder()
                    .user(user)
                    .wpm(dto.getWpm())
                    .accuracy(dto.getAccuracy())
                    .nickname(activeNickname)
                    .build();
            typeRacerRecordRepository.save(newRecord);
            return true;
        }

        TypeRacerRecordEntity existingRecord = optionalRecord.get();

        // 최고 기록 판별 기준: WPM이 높거나, WPM이 같을 때 정확도가 높은 경우
        boolean isNewRecord = dto.getWpm() > existingRecord.getWpm() || 
                (dto.getWpm().equals(existingRecord.getWpm()) && dto.getAccuracy() > existingRecord.getAccuracy());

        if (isNewRecord) {
            existingRecord.updateRecord(dto.getWpm(), dto.getAccuracy(), activeNickname);
            return true;
        }

        // 기존 최고 기록에 미치지 못할 경우 닉네임만 최신화 (회원정보 변경 대응)
        if (!existingRecord.getNickname().equals(activeNickname)) {
            existingRecord.updateRecord(existingRecord.getWpm(), existingRecord.getAccuracy(), activeNickname);
        }

        return false;
    }

    /**
     * 상위 10명의 명예의 전당 리더보드 조회
     * @return 순위가 책정된 TypeRacerResponseDTO 리스트
     */
    public List<TypeRacerResponseDTO> getTop10Leaderboard() {
        List<TypeRacerRecordEntity> records = typeRacerRecordRepository.findTop10ByOrderByWpmDescAccuracyDesc();
        List<TypeRacerResponseDTO> dtoList = new ArrayList<>();

        for (int i = 0; i < records.size(); i++) {
            TypeRacerRecordEntity record = records.get(i);
            dtoList.add(TypeRacerResponseDTO.builder()
                    .rank(i + 1)
                    .nickname(record.getNickname())
                    .wpm(record.getWpm())
                    .accuracy(record.getAccuracy())
                    .updatedDate(record.getUpdatedDate())
                    .build());
        }

        return dtoList;
    }
}
