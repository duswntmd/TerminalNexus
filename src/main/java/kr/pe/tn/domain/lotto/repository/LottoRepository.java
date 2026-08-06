package kr.pe.tn.domain.lotto.repository;

import kr.pe.tn.domain.lotto.entity.LottoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LottoRepository extends JpaRepository<LottoEntity, Long> {
    Optional<LottoEntity> findFirstByOrderByDrwNoDesc();
}
