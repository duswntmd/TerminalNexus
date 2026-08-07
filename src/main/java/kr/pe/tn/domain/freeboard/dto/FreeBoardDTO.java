package kr.pe.tn.domain.freeboard.dto;

import kr.pe.tn.domain.freeboard.entity.FreeBoard;
import kr.pe.tn.domain.freeboard.entity.FreeBoardFile;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class FreeBoardDTO {

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Request {
        private String title;
        private String content;
        private List<UploadResultDTO> fileDTOs;
        private List<String> deletedFileIds; // 삭제할 파일의 UUID 목록

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public List<UploadResultDTO> getFileDTOs() { return fileDTOs; }
        public void setFileDTOs(List<UploadResultDTO> fileDTOs) { this.fileDTOs = fileDTOs; }
        public List<String> getDeletedFileIds() { return deletedFileIds; }
        public void setDeletedFileIds(List<String> deletedFileIds) { this.deletedFileIds = deletedFileIds; }
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Response {
        private Long id;
        private String title;
        private String content;
        private String writerNickname;
        private String writerUsername;
        private Long viewCount;
        private Long likeCount;
        private Long dislikeCount;
        private boolean isLiked;
        private boolean isDisliked;
        private boolean canEdit; // 수정 권한 여부
        private boolean canDelete; // 삭제 권한 여부
        private LocalDateTime regDate;
        private LocalDateTime modDate;
        private int commentCount;
        private List<UploadResultDTO> fileDTOs;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getWriterNickname() { return writerNickname; }
        public void setWriterNickname(String writerNickname) { this.writerNickname = writerNickname; }
        public String getWriterUsername() { return writerUsername; }
        public void setWriterUsername(String writerUsername) { this.writerUsername = writerUsername; }
        public Long getViewCount() { return viewCount; }
        public void setViewCount(Long viewCount) { this.viewCount = viewCount; }
        public Long getLikeCount() { return likeCount; }
        public void setLikeCount(Long likeCount) { this.likeCount = likeCount; }
        public Long getDislikeCount() { return dislikeCount; }
        public void setDislikeCount(Long dislikeCount) { this.dislikeCount = dislikeCount; }
        public boolean isLiked() { return isLiked; }
        public void setLiked(boolean isLiked) { this.isLiked = isLiked; }
        public boolean isDisliked() { return isDisliked; }
        public void setDisliked(boolean isDisliked) { this.isDisliked = isDisliked; }
        public boolean isCanEdit() { return canEdit; }
        public void setCanEdit(boolean canEdit) { this.canEdit = canEdit; }
        public boolean isCanDelete() { return canDelete; }
        public void setCanDelete(boolean canDelete) { this.canDelete = canDelete; }
        public LocalDateTime getRegDate() { return regDate; }
        public void setRegDate(LocalDateTime regDate) { this.regDate = regDate; }
        public LocalDateTime getModDate() { return modDate; }
        public void setModDate(LocalDateTime modDate) { this.modDate = modDate; }
        public int getCommentCount() { return commentCount; }
        public void setCommentCount(int commentCount) { this.commentCount = commentCount; }
        public List<UploadResultDTO> getFileDTOs() { return fileDTOs; }
        public void setFileDTOs(List<UploadResultDTO> fileDTOs) { this.fileDTOs = fileDTOs; }

        public static Response from(FreeBoard entity) {
            // Note: isLiked needs to be set separately or via constructor if possible,
            // but here we might need to set it in Service or Controller.
            // For now, let's keep it default false and handle it in Read/List if needed.
            // Actually, 'isLiked' depends on the Viewer, not just the Entity.
            // So 'from(entity)' cannot determine 'isLiked' without user context.
            // I will leave isLiked as field, but 'from' won't set it. Service will set it.
            return Response.builder()
                    .id(entity.getId())
                    .title(entity.getTitle())
                    .content(entity.getContent())
                    .writerNickname(entity.getUser().getNickname())
                    .writerUsername(entity.getUser().getUsername())
                    .viewCount(entity.getViewCount())
                    .likeCount(entity.getLikeCount())
                    .dislikeCount(entity.getDislikeCount())
                    .isLiked(false) // Default
                    .isDisliked(false) // Default
                    .canEdit(false) // Default, Service에서 설정
                    .canDelete(false) // Default, Service에서 설정
                    .regDate(entity.getRegDate())
                    .modDate(entity.getModDate())
                    .fileDTOs(entity.getFiles() != null ? entity.getFiles().stream()
                            .map((FreeBoardFile file) -> new UploadResultDTO(file.getOriginalName(), file.getUuid(), file.getPath(),
                                    file.getType(), file.getYoutubeUrl()))
                            .collect(java.util.stream.Collectors.toList()) : java.util.Collections.emptyList())
                    .build();
        }

        public static ResponseBuilder builder() { return new ResponseBuilder(); }

        public static class ResponseBuilder {
            private Long id;
            private String title;
            private String content;
            private String writerNickname;
            private String writerUsername;
            private Long viewCount;
            private Long likeCount;
            private Long dislikeCount;
            private boolean isLiked;
            private boolean isDisliked;
            private boolean canEdit;
            private boolean canDelete;
            private LocalDateTime regDate;
            private LocalDateTime modDate;
            private int commentCount;
            private List<UploadResultDTO> fileDTOs;

            public ResponseBuilder id(Long id) { this.id = id; return this; }
            public ResponseBuilder title(String title) { this.title = title; return this; }
            public ResponseBuilder content(String content) { this.content = content; return this; }
            public ResponseBuilder writerNickname(String writerNickname) { this.writerNickname = writerNickname; return this; }
            public ResponseBuilder writerUsername(String writerUsername) { this.writerUsername = writerUsername; return this; }
            public ResponseBuilder viewCount(Long viewCount) { this.viewCount = viewCount; return this; }
            public ResponseBuilder likeCount(Long likeCount) { this.likeCount = likeCount; return this; }
            public ResponseBuilder dislikeCount(Long dislikeCount) { this.dislikeCount = dislikeCount; return this; }
            public ResponseBuilder isLiked(boolean isLiked) { this.isLiked = isLiked; return this; }
            public ResponseBuilder isDisliked(boolean isDisliked) { this.isDisliked = isDisliked; return this; }
            public ResponseBuilder canEdit(boolean canEdit) { this.canEdit = canEdit; return this; }
            public ResponseBuilder canDelete(boolean canDelete) { this.canDelete = canDelete; return this; }
            public ResponseBuilder regDate(LocalDateTime regDate) { this.regDate = regDate; return this; }
            public ResponseBuilder modDate(LocalDateTime modDate) { this.modDate = modDate; return this; }
            public ResponseBuilder commentCount(int commentCount) { this.commentCount = commentCount; return this; }
            public ResponseBuilder fileDTOs(List<UploadResultDTO> fileDTOs) { this.fileDTOs = fileDTOs; return this; }

            public Response build() {
                Response r = new Response();
                r.id = this.id;
                r.title = this.title;
                r.content = this.content;
                r.writerNickname = this.writerNickname;
                r.writerUsername = this.writerUsername;
                r.viewCount = this.viewCount;
                r.likeCount = this.likeCount;
                r.dislikeCount = this.dislikeCount;
                r.isLiked = this.isLiked;
                r.isDisliked = this.isDisliked;
                r.canEdit = this.canEdit;
                r.canDelete = this.canDelete;
                r.regDate = this.regDate;
                r.modDate = this.modDate;
                r.commentCount = this.commentCount;
                r.fileDTOs = this.fileDTOs;
                return r;
            }
        }
    }
}
