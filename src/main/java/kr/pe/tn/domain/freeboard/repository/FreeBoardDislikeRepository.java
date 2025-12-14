package kr.pe.tn.domain.freeboard.repository;

import kr.pe.tn.domain.freeboard.entity.FreeBoardDislike;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import kr.pe.tn.domain.freeboard.entity.FreeBoard;

import java.util.Optional;

public interface FreeBoardDislikeRepository extends JpaRepository<FreeBoardDislike, Long> {
    Optional<FreeBoardDislike> findByUserAndFreeBoard(UserEntity user, FreeBoard freeBoard);

    boolean existsByUserAndFreeBoard(UserEntity user, FreeBoard freeBoard);
}
