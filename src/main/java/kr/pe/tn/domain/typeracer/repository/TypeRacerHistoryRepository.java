package kr.pe.tn.domain.typeracer.repository;

import kr.pe.tn.domain.typeracer.entity.TypeRacerHistoryEntity;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TypeRacerHistoryRepository extends JpaRepository<TypeRacerHistoryEntity, Long> {
    List<TypeRacerHistoryEntity> findByUserOrderByCreatedDateDesc(UserEntity user, Pageable pageable);
}
