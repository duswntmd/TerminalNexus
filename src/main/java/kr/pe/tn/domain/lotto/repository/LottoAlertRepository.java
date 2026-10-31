package kr.pe.tn.domain.lotto.repository;

import kr.pe.tn.domain.lotto.entity.LottoAlertEntity;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LottoAlertRepository extends JpaRepository<LottoAlertEntity, Long> {
    List<LottoAlertEntity> findTop10ByUserOrderByDrwNoDesc(UserEntity user);

    boolean existsByDrwNo(Long drwNo);

    long countByUserAndReadFalse(UserEntity user);

    @Modifying
    @Query("UPDATE LottoAlertEntity a SET a.read = true WHERE a.user = :user AND a.read = false")
    int markAllRead(@Param("user") UserEntity user);
}
