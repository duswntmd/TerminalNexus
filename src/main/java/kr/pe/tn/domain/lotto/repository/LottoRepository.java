package kr.pe.tn.domain.lotto.repository;

import kr.pe.tn.domain.lotto.entity.LottoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LottoRepository extends JpaRepository<LottoEntity, Long> {
    Optional<LottoEntity> findFirstByOrderByDrwNoDesc();

    /** 상세 정보(1인당 당첨금)까지 채워진 회차 수 — 예전 형식 데이터 재수집 판단용 */
    long countByFirstWinamntIsNotNull();
}
