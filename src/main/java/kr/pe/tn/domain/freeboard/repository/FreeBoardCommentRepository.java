package kr.pe.tn.domain.freeboard.repository;

import kr.pe.tn.domain.freeboard.entity.FreeBoardComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FreeBoardCommentRepository extends JpaRepository<FreeBoardComment, Long> {

    // 특정 게시글의 모든 댓글 조회 (최상위 댓글만, 삭제되지 않은 것)
    @Query("SELECT c FROM FreeBoardComment c WHERE c.freeBoard.id = :boardId AND c.parent IS NULL ORDER BY c.regDate ASC")
    List<FreeBoardComment> findTopLevelCommentsByBoardId(@Param("boardId") Long boardId);

    // 특정 게시글의 모든 댓글 수 (삭제된 것 제외)
    @Query("SELECT COUNT(c) FROM FreeBoardComment c WHERE c.freeBoard.id = :boardId AND c.isDeleted = false")
    Long countByBoardId(@Param("boardId") Long boardId);

    // 특정 부모 댓글의 대댓글 조회
    @Query("SELECT c FROM FreeBoardComment c WHERE c.parent.id = :parentId ORDER BY c.regDate ASC")
    List<FreeBoardComment> findRepliesByParentId(@Param("parentId") Long parentId);
}
