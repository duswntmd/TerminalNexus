package kr.pe.tn.api;

import kr.pe.tn.domain.freeboard.dto.FreeBoardCommentDTO;
import kr.pe.tn.domain.freeboard.service.FreeBoardCommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/freeboard/{boardId}/comments")
@RequiredArgsConstructor
public class FreeBoardCommentController {

    private final FreeBoardCommentService commentService;

    // 댓글 목록 조회
    @GetMapping
    public ResponseEntity<List<FreeBoardCommentDTO.Response>> getComments(@PathVariable("boardId") Long boardId) {
        return ResponseEntity.ok(commentService.getComments(boardId));
    }

    // 댓글 작성
    @PostMapping
    public ResponseEntity<Map<String, Long>> createComment(
            @PathVariable("boardId") Long boardId,
            @RequestBody FreeBoardCommentDTO.Request requestDTO) {
        Long commentId = commentService.createComment(boardId, requestDTO);
        return ResponseEntity.status(201).body(Collections.singletonMap("id", commentId));
    }

    // 댓글 수정
    @PutMapping("/{commentId}")
    public ResponseEntity<Long> updateComment(
            @PathVariable("boardId") Long boardId,
            @PathVariable("commentId") Long commentId,
            @RequestBody FreeBoardCommentDTO.Request requestDTO) {
        return ResponseEntity.ok(commentService.updateComment(commentId, requestDTO));
    }

    // 댓글 삭제
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Map<String, String>> deleteComment(
            @PathVariable("boardId") Long boardId,
            @PathVariable("commentId") Long commentId) {
        commentService.deleteComment(commentId);
        return ResponseEntity.ok(Collections.singletonMap("message", "Deleted successfully"));
    }
}
