package kr.pe.tn.domain.freeboard.service;

import kr.pe.tn.domain.freeboard.dto.FreeBoardCommentDTO;
import kr.pe.tn.domain.freeboard.entity.FreeBoard;
import kr.pe.tn.domain.freeboard.entity.FreeBoardComment;
import kr.pe.tn.domain.freeboard.repository.FreeBoardCommentRepository;
import kr.pe.tn.domain.freeboard.repository.FreeBoardRepository;
import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.entity.UserRoleType;
import kr.pe.tn.domain.user.repository.UserRepository;
import kr.pe.tn.util.PermissionValidator;
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
    private final PermissionValidator permissionValidator;

    // 댓글 목록 조회
    public List<FreeBoardCommentDTO.Response> getComments(Long boardId) {
        // 최상위 댓글만 조회 (대댓글은 children으로 자동 포함)
        List<FreeBoardComment> comments = commentRepository.findTopLevelCommentsByBoardId(boardId);

        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        return comments.stream()
                .map(comment -> {
                    FreeBoardCommentDTO.Response dto = FreeBoardCommentDTO.Response.from(comment);
                    // 권한 설정 (재귀적으로 모든 children 포함)
                    setPermissionsRecursively(dto, username);
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
    @Transactional(readOnly = false) // 명시적으로 쓰기 모드 설정
    public Long updateComment(Long commentId, FreeBoardCommentDTO.Request requestDTO) {
        FreeBoardComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NoSuchElementException("Comment not found"));

        // 권한 검증 (작성자 본인만)
        permissionValidator.validateWriterOnly(
                comment.getUser().getUsername(),
                "작성자만 수정할 수 있습니다.");

        comment.changeComment(requestDTO.getComment());

        // modDate 수동 업데이트
        comment.updateModifiedDate();

        // 명시적 save()로 DB 반영
        FreeBoardComment saved = commentRepository.save(comment);

        return saved.getId();
    }

    // 댓글 삭제 (하이브리드 삭제 + 계단식 정리)
    @Transactional
    public void deleteComment(Long commentId) {

        FreeBoardComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NoSuchElementException("댓글을 찾을 수 없습니다."));

        // 본인 또는 관리자 확인
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserEntity user = userRepository.findByUsernameAndIsLock(username, false).orElse(null);

        boolean isWriter = comment.getUser().getUsername().equals(username);
        boolean isAdmin = user != null && user.getRoleType() == UserRoleType.ADMIN;

        if (!isWriter && !isAdmin) {
            throw new AccessDeniedException("삭제 권한이 없습니다.");
        }

        // 자식 댓글이 있는지 확인
        if (comment.getChildren() != null && !comment.getChildren().isEmpty()) {
            // 자식이 있으면 Soft Delete
            comment.changeIsDeleted(true);
        } else {
            // 자식이 없으면 Hard Delete
            Long parentId = comment.getParent() != null ? comment.getParent().getId() : null;

            // 현재 댓글 삭제
            commentRepository.delete(comment);
            commentRepository.flush(); // 즉시 반영

            // 반복문으로 부모 정리
            while (parentId != null) {
                FreeBoardComment parent = commentRepository.findById(parentId).orElse(null);

                if (parent == null || !parent.getIsDeleted()) {
                    break; // 부모가 없거나 삭제 상태가 아니면 종료
                }

                // 부모의 자식 중 삭제되지 않은 것이 있는지 확인
                long remainingChildren = parent.getChildren().stream()
                        .filter(child -> !child.getIsDeleted())
                        .count();

                if (remainingChildren == 0) {
                    // 모든 자식이 삭제 상태이면 부모도 삭제
                    Long grandParentId = parent.getParent() != null ? parent.getParent().getId() : null;
                    commentRepository.delete(parent);
                    commentRepository.flush(); // 즉시 반영
                    parentId = grandParentId; // 다음 부모로 이동
                } else {
                    break; // 삭제되지 않은 자식이 있으면 종료
                }
            }
        }
    }

    // 권한 설정 헬퍼 메서드 (재귀적으로 모든 children 처리)
    private void setPermissionsRecursively(FreeBoardCommentDTO.Response dto, String username) {
        setPermissions(dto, username);
        // 자식 댓글들도 재귀적으로 권한 설정
        if (dto.getChildren() != null && !dto.getChildren().isEmpty()) {
            dto.getChildren().forEach(child -> setPermissionsRecursively(child, username));
        }
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

                // 디버깅 로그 (depth 2+ 댓글만)
                if (dto.getParentId() != null) {
                    System.out.println("🔍 권한 설정: ID=" + dto.getId() +
                            ", writer=" + dto.getWriterNickname() +
                            ", canDelete=" + (isWriter || isAdmin));
                }
            }
        }
    }
}
