package kr.pe.tn.domain.freeboard.dto;

import kr.pe.tn.domain.freeboard.entity.FreeBoardComment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class FreeBoardCommentDTO {

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Request {
        private String comment;
        private Long parentId; // null이면 최상위 댓글, 값이 있으면 대댓글
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Response {
        private Long id;
        private String comment;
        private String writerNickname;
        private String writerUsername;
        private Long parentId;
        private boolean isDeleted;
        private boolean canEdit; // 수정 권한
        private boolean canDelete; // 삭제 권한
        private LocalDateTime regDate;
        private LocalDateTime modDate;
        private List<Response> children; // 대댓글 목록

        // Entity -> DTO 변환 (children 포함)
        public static Response from(FreeBoardComment entity) {
            return Response.builder()
                    .id(entity.getId())
                    .comment(entity.getComment())
                    .writerNickname(entity.getUser().getNickname())
                    .writerUsername(entity.getUser().getUsername())
                    .parentId(entity.getParent() != null ? entity.getParent().getId() : null)
                    .isDeleted(entity.getIsDeleted())
                    .canEdit(false) // Service에서 설정
                    .canDelete(false) // Service에서 설정
                    .regDate(entity.getRegDate())
                    .modDate(entity.getModDate())
                    .children(entity.getChildren().stream()
                            .map(Response::from)
                            .collect(Collectors.toList()))
                    .build();
        }
    }
}
