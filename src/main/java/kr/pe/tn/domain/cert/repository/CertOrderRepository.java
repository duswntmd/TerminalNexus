package kr.pe.tn.domain.cert.repository;

import jakarta.persistence.LockModeType;
import kr.pe.tn.domain.cert.entity.CertOrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CertOrderRepository extends JpaRepository<CertOrderEntity, Long> {
    /** 화면 검증과 웹훅이 동시에 와도 이용권이 한 번만 지급되도록 잠금 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM CertOrderEntity o WHERE o.merchantUid = :uid")
    Optional<CertOrderEntity> findByMerchantUidForUpdate(@Param("uid") String merchantUid);
}
