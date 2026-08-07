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

        public static ResponseBuilder builder() { return new ResponseBuilder(); }
        public static class ResponseBuilder {
            private Long id;
            private String name;
            private String englishName;
            private String benefits;
            private String nutrients;
            private String description;
            private String season;
            private String origin;

            public ResponseBuilder id(Long id) { this.id = id; return this; }
            public ResponseBuilder name(String name) { this.name = name; return this; }
            public ResponseBuilder englishName(String englishName) { this.englishName = englishName; return this; }
            public ResponseBuilder benefits(String benefits) { this.benefits = benefits; return this; }
            public ResponseBuilder nutrients(String nutrients) { this.nutrients = nutrients; return this; }
            public ResponseBuilder description(String description) { this.description = description; return this; }
            public ResponseBuilder season(String season) { this.season = season; return this; }
            public ResponseBuilder origin(String origin) { this.origin = origin; return this; }

            public Response build() {
                Response r = new Response();
                r.id = this.id;
                r.name = this.name;
                r.englishName = this.englishName;
                r.benefits = this.benefits;
                r.nutrients = this.nutrients;
                r.description = this.description;
                r.season = this.season;
                r.origin = this.origin;
                return r;
            }
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

        public String getQuestion() { return question; }
        public void setQuestion(String question) { this.question = question; }
    }

    /**
     * RAG 답변 응답 DTO
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnswerResponse {
        private String question; // 원본 질문
        private String answer; // Gemini AI가 생성한 답변
        private java.util.List<Response> relatedFruits; // 검색된 관련 과일 목록

        public String getQuestion() { return question; }
        public void setQuestion(String question) { this.question = question; }
        public String getAnswer() { return answer; }
        public void setAnswer(String answer) { this.answer = answer; }
        public java.util.List<Response> getRelatedFruits() { return relatedFruits; }
        public void setRelatedFruits(java.util.List<Response> relatedFruits) { this.relatedFruits = relatedFruits; }

        public static AnswerResponseBuilder builder() { return new AnswerResponseBuilder(); }
        public static class AnswerResponseBuilder {
            private String question;
            private String answer;
            private java.util.List<Response> relatedFruits;

            public AnswerResponseBuilder question(String question) { this.question = question; return this; }
            public AnswerResponseBuilder answer(String answer) { this.answer = answer; return this; }
            public AnswerResponseBuilder relatedFruits(java.util.List<Response> relatedFruits) { this.relatedFruits = relatedFruits; return this; }

            public AnswerResponse build() {
                AnswerResponse res = new AnswerResponse();
                res.setQuestion(question);
                res.setAnswer(answer);
                res.setRelatedFruits(relatedFruits);
                return res;
            }
        }
    }
}
