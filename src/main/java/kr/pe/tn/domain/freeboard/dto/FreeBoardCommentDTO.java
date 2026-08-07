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

        public String getComment() { return comment; }
        public void setComment(String comment) { this.comment = comment; }
        public Long getParentId() { return parentId; }
        public void setParentId(Long parentId) { this.parentId = parentId; }
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

        @com.fasterxml.jackson.annotation.JsonProperty("isDeleted")
        private boolean isDeleted;

        @com.fasterxml.jackson.annotation.JsonProperty("canEdit")
        private boolean canEdit; // 수정 권한

        @com.fasterxml.jackson.annotation.JsonProperty("canDelete")
        private boolean canDelete; // 삭제 권한
        private LocalDateTime regDate;
        private LocalDateTime modDate;
        private List<Response> children; // 대댓글 목록

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getComment() { return comment; }
        public void setComment(String comment) { this.comment = comment; }
        public String getWriterNickname() { return writerNickname; }
        public void setWriterNickname(String writerNickname) { this.writerNickname = writerNickname; }
        public String getWriterUsername() { return writerUsername; }
        public void setWriterUsername(String writerUsername) { this.writerUsername = writerUsername; }
        public Long getParentId() { return parentId; }
        public void setParentId(Long parentId) { this.parentId = parentId; }
        public boolean isDeleted() { return isDeleted; }
        public void setDeleted(boolean isDeleted) { this.isDeleted = isDeleted; }
        public boolean isCanEdit() { return canEdit; }
        public void setCanEdit(boolean canEdit) { this.canEdit = canEdit; }
        public boolean isCanDelete() { return canDelete; }
        public void setCanDelete(boolean canDelete) { this.canDelete = canDelete; }
        public LocalDateTime getRegDate() { return regDate; }
        public void setRegDate(LocalDateTime regDate) { this.regDate = regDate; }
        public LocalDateTime getModDate() { return modDate; }
        public void setModDate(LocalDateTime modDate) { this.modDate = modDate; }
        public List<Response> getChildren() { return children; }
        public void setChildren(List<Response> children) { this.children = children; }

        // Entity -> DTO 변환 (children 포함)
        public static Response from(FreeBoardComment entity) {
            return Response.builder()
                    .id(entity.getId())
                    .comment(entity.getComment())
                    .writerNickname(entity.getUser().getNickname())
                    .writerUsername(entity.getUser().getUsername())
                    .parentId(entity.getParent() != null ? entity.getParent().getId() : null)
                    .isDeleted(entity.getIsDeleted() != null ? entity.getIsDeleted() : false)
                    .canEdit(false) // Service에서 설정
                    .canDelete(false) // Service에서 설정
                    .regDate(entity.getRegDate())
                    .modDate(entity.getModDate())
                    .children(entity.getChildren() != null ? entity.getChildren().stream()
                            .map(Response::from)
                            .collect(Collectors.toList()) : java.util.Collections.emptyList())
                    .build();
        }

        public static ResponseBuilder builder() { return new ResponseBuilder(); }

        public static class ResponseBuilder {
            private Long id;
            private String comment;
            private String writerNickname;
            private String writerUsername;
            private Long parentId;
            private boolean isDeleted;
            private boolean canEdit;
            private boolean canDelete;
            private LocalDateTime regDate;
            private LocalDateTime modDate;
            private List<Response> children;

            public ResponseBuilder id(Long id) { this.id = id; return this; }
            public ResponseBuilder comment(String comment) { this.comment = comment; return this; }
            public ResponseBuilder writerNickname(String writerNickname) { this.writerNickname = writerNickname; return this; }
            public ResponseBuilder writerUsername(String writerUsername) { this.writerUsername = writerUsername; return this; }
            public ResponseBuilder parentId(Long parentId) { this.parentId = parentId; return this; }
            public ResponseBuilder isDeleted(boolean isDeleted) { this.isDeleted = isDeleted; return this; }
            public ResponseBuilder canEdit(boolean canEdit) { this.canEdit = canEdit; return this; }
            public ResponseBuilder canDelete(boolean canDelete) { this.canDelete = canDelete; return this; }
            public ResponseBuilder regDate(LocalDateTime regDate) { this.regDate = regDate; return this; }
            public ResponseBuilder modDate(LocalDateTime modDate) { this.modDate = modDate; return this; }
            public ResponseBuilder children(List<Response> children) { this.children = children; return this; }

            public Response build() {
                Response r = new Response();
                r.id = this.id;
                r.comment = this.comment;
                r.writerNickname = this.writerNickname;
                r.writerUsername = this.writerUsername;
                r.parentId = this.parentId;
                r.isDeleted = this.isDeleted;
                r.canEdit = this.canEdit;
                r.canDelete = this.canDelete;
                r.regDate = this.regDate;
                r.modDate = this.modDate;
                r.children = this.children;
                return r;
            }
        }
    }
}
