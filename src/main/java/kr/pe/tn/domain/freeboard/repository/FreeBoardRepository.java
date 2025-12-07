package kr.pe.tn.domain.freeboard.repository;

import kr.pe.tn.domain.freeboard.entity.FreeBoard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FreeBoardRepository extends JpaRepository<FreeBoard, Long>, FreeBoardSearch {

    @Modifying
    @Query("update FreeBoard b set b.viewCount = b.viewCount + 1 where b.id = :id")
    void updateViewCount(@Param("id") Long id);
}
