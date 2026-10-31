package kr.pe.tn.domain.cert.repository;

import kr.pe.tn.domain.cert.entity.CertPassEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CertPassRepository extends JpaRepository<CertPassEntity, Long> {
}
