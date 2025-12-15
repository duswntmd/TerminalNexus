package kr.pe.tn.domain.freeboard.service;

import kr.pe.tn.domain.freeboard.dto.FreeBoardCommentDTO;
import kr.pe.tn.domain.freeboard.entity.FreeBoard;
import kr.pe.tn.domain.freeboard.entity.FreeBoardComment;
import kr.pe.tn.domain.freeboard.repository.FreeBoardCommentRepository;
import kr.pe.tn.domain.freeboard.repository.FreeBoardRepository;
import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.entity.UserRoleType;
import kr.pe.tn.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FreeBoardCommentService {

    private final FreeBoardCommentRepository commentRepository;
    private final FreeBoardRepository boardRepository;
    private final UserRepository userRepository;

    // 댓글 목록 조회
    public List<FreeBoardCommentDTO.Response> getComments(Long boardId) {
        // 최상위 댓글만 조회 (대댓글은 children으로 자동 포함)
        List<FreeBoardComment> comments = commentRepository.findTopLevelCommentsByBoardId(boardId);

        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        return comments.stream()
                .map(comment -> {
                    FreeBoardCommentDTO.Response dto = FreeBoardCommentDTO.Response.from(comment);
                    // 권한 설정
                    setPermissions(dto, username);
                    // 대댓글들의 권한도 설정
                    dto.getChildren().forEach(child -> setPermissions(child, username));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    // 댓글 작성
    @Transactional
    public Long createComment(Long boardId, FreeBoardCommentDTO.Request requestDTO) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserEntity user = userRepository.findByUsernameAndIsLock(username, false)
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        FreeBoard board = boardRepository.findById(boardId)
                .orElseThrow(() -> new NoSuchElementException("Board not found"));

        FreeBoardComment comment = FreeBoardComment.builder()
                .comment(requestDTO.getComment())
                .freeBoard(board)
                .user(user)
                .build();

        // 대댓글인 경우 부모 설정
        if (requestDTO.getParentId() != null) {
            FreeBoardComment parent = commentRepository.findById(requestDTO.getParentId())
                    .orElseThrow(() -> new NoSuchElementException("Parent comment not found"));
            parent.addChild(comment);
        }

        return commentRepository.save(comment).getId();
    }

    // 댓글 수정
    @Transactional
    public Long updateComment(Long commentId, FreeBoardCommentDTO.Request requestDTO) {
        FreeBoardComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NoSuchElementException("Comment not found"));

        // 본인 확인
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!comment.getUser().getUsername().equals(username)) {
            throw new AccessDeniedException("Only the writer can modify.");
        }

        comment.changeComment(requestDTO.getComment());
        return comment.getId();
    }

    // 댓글 삭제 (Soft Delete)
    @Transactional
    public void deleteComment(Long commentId) {
        FreeBoardComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NoSuchElementException("Comment not found"));

        // 본인 또는 관리자 확인
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserEntity user = userRepository.findByUsernameAndIsLock(username, false).orElse(null);

        boolean isWriter = comment.getUser().getUsername().equals(username);
        boolean isAdmin = user != null && user.getRoleType() == UserRoleType.ADMIN;

        if (!isWriter && !isAdmin) {
            throw new AccessDeniedException("Only the writer or admin can delete.");
        }

        comment.changeIsDeleted(true);
    }

    // 권한 설정 헬퍼 메서드
    private void setPermissions(FreeBoardCommentDTO.Response dto, String username) {
        if (!username.equals("anonymousUser")) {
            UserEntity user = userRepository.findByUsernameAndIsLock(username, false).orElse(null);
            if (user != null) {
                boolean isWriter = dto.getWriterUsername().equals(username);
                boolean isAdmin = user.getRoleType() == UserRoleType.ADMIN;

                dto.setCanEdit(isWriter);
                dto.setCanDelete(isWriter || isAdmin);
            }
        }
    }
}
