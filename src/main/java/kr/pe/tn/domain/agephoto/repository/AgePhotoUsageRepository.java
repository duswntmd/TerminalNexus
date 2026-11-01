package kr.pe.tn.domain.agephoto.repository;

import kr.pe.tn.domain.agephoto.entity.AgePhotoUsageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.Optional;

public interface AgePhotoUsageRepository extends JpaRepository<AgePhotoUsageEntity, Long> {

    Optional<AgePhotoUsageEntity> findByUserIdAndUsageDate(Long userId, LocalDate usageDate);

    @Query("select coalesce(sum(u.used), 0) from AgePhotoUsageEntity u where u.usageDate = :date")
    long totalOn(LocalDate date);
}
