package kr.pe.tn.domain.cert.repository;

import jakarta.persistence.LockModeType;
import kr.pe.tn.domain.cert.entity.CertAttemptEntity;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CertAttemptRepository extends JpaRepository<CertAttemptEntity, Long> {
    List<CertAttemptEntity> findTop10ByUserAndStatusOrderByIdDesc(UserEntity user, CertAttemptEntity.Status status);

    Optional<CertAttemptEntity> findFirstByUserAndStatusOrderByIdDesc(UserEntity user, CertAttemptEntity.Status status);

    boolean existsByUserAndMode(UserEntity user, CertAttemptEntity.Mode mode);

    /** 제출이 두 번 들어와도 한 번만 채점되도록 잠금 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM CertAttemptEntity a WHERE a.id = :id")
    Optional<CertAttemptEntity> findByIdForUpdate(@Param("id") Long id);
}
