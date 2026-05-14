package kr.pe.tn.domain.forge.repository;

import kr.pe.tn.domain.forge.entity.ForgeRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ForgeRecordRepository extends JpaRepository<ForgeRecordEntity, Long> {

    Optional<ForgeRecordEntity> findByUsername(String username);

    /** 최고 단계 기준 내림차순 TOP 20 */
    @Query("SELECT f FROM ForgeRecordEntity f ORDER BY f.maxLevel DESC, f.updatedAt ASC")
    List<ForgeRecordEntity> findTop20ByOrderByMaxLevelDesc();
}
