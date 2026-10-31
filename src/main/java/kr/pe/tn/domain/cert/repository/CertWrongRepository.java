package kr.pe.tn.domain.cert.repository;

import kr.pe.tn.domain.cert.entity.CertWrongEntity;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CertWrongRepository extends JpaRepository<CertWrongEntity, Long> {
    Optional<CertWrongEntity> findByUserAndQuestionId(UserEntity user, String questionId);

    List<CertWrongEntity> findByUserAndResolvedFalseOrderByLastWrongAtDesc(UserEntity user);

    long countByUserAndResolvedFalse(UserEntity user);
}
