package kr.pe.tn.domain.fruit.dto;

import kr.pe.tn.domain.fruit.entity.Fruit;
import lombok.*;

/**
 * 과일 정보 DTO
 */
public class FruitDTO {

    /**
     * 과일 정보 응답 DTO
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private Long id;
        private String name;
        private String englishName;
        private String benefits;
        private String nutrients;
        private String description;
        private String season;
        private String origin;

        public static Response from(Fruit fruit) {
            return Response.builder()
                    .id(fruit.getId())
                    .name(fruit.getName())
                    .englishName(fruit.getEnglishName())
                    .benefits(fruit.getBenefits())
                    .nutrients(fruit.getNutrients())
                    .description(fruit.getDescription())
                    .season(fruit.getSeason())
                    .origin(fruit.getOrigin())
                    .build();
        }
    }

    /**
     * RAG 질문 요청 DTO
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionRequest {
        private String question; // 사용자 질문 (예: "비타민C가 많은 과일은?")
    }

    /**
     * RAG 답변 응답 DTO
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AnswerResponse {
        private String question; // 원본 질문
        private String answer; // Gemini AI가 생성한 답변
        private java.util.List<Response> relatedFruits; // 검색된 관련 과일 목록
    }
}
