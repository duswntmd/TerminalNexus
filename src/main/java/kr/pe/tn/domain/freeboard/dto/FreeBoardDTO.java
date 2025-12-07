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
        private LocalDateTime regDate;
        private LocalDateTime modDate;
        private int commentCount;
        private List<UploadResultDTO> fileDTOs;

        public static Response from(FreeBoard entity) {
            return Response.builder()
                    .id(entity.getId())
                    .title(entity.getTitle())
                    .content(entity.getContent())
                    .writerNickname(entity.getUser().getNickname())
                    .writerUsername(entity.getUser().getUsername())
                    .viewCount(entity.getViewCount())
                    .regDate(entity.getRegDate())
                    .modDate(entity.getModDate())
                    .fileDTOs(entity.getFiles().stream()
                            .map(file -> new UploadResultDTO(file.getOriginalName(), file.getUuid(), file.getPath(),
                                    file.getType()))
                            .toList())
                    .build();
        }
    }
}
