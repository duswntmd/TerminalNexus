package kr.pe.tn.domain.typeracer.repository;

import kr.pe.tn.domain.typeracer.entity.TypeRacerRecordEntity;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TypeRacerRecordRepository extends JpaRepository<TypeRacerRecordEntity, Long> {

    // 특정 유저의 최고 기록 찾기
    Optional<TypeRacerRecordEntity> findByUser(UserEntity user);

    // WPM 내림차순, Accuracy 내림차순으로 Top 10 기록 조회
    List<TypeRacerRecordEntity> findTop10ByOrderByWpmDescAccuracyDesc();
}
