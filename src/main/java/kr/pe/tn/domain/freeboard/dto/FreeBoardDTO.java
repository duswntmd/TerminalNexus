package kr.pe.tn.domain.freeboard.dto;

import kr.pe.tn.domain.freeboard.entity.FreeBoard;
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
        private boolean isLiked;
        private LocalDateTime regDate;
        private LocalDateTime modDate;
        private int commentCount;
        private List<UploadResultDTO> fileDTOs;

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
                    .isLiked(false) // Default
                    .regDate(entity.getRegDate())
                    .modDate(entity.getModDate())
                    .fileDTOs(entity.getFiles().stream()
                            .map(file -> new UploadResultDTO(file.getOriginalName(), file.getUuid(), file.getPath(),
                                    file.getType(), file.getYoutubeUrl()))
                            .toList())
                    .build();
        }
    }
}
