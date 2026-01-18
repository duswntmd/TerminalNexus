package kr.pe.tn.domain.fruit.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.pe.tn.domain.fruit.dto.FruitDTO;
import kr.pe.tn.domain.fruit.entity.Fruit;
import kr.pe.tn.domain.fruit.repository.FruitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Gemini AI를 활용한 RAG(Retrieval-Augmented Generation) 서비스
 * 
 * 동작 방식:
 * 1. 사용자 질문 수신
 * 2. 데이터베이스에서 관련 과일 정보 검색 (Retrieval)
 * 3. 검색된 정보를 Gemini AI에 컨텍스트로 제공
 * 4. Gemini AI가 컨텍스트 기반으로 답변 생성 (Generation)
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FruitRAGService {

    private final FruitRepository fruitRepository;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    // Gemini 2.5 Flash Lite 모델 사용 (RPM: 10, TPM: 250K, RPD: 20)
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent";

    /**
     * RAG 기반 질문 답변 생성
     * 
     * @param questionRequest 사용자 질문
     * @return AI가 생성한 답변 및 관련 과일 정보
     */
    public FruitDTO.AnswerResponse answerQuestion(FruitDTO.QuestionRequest questionRequest) {
        String question = questionRequest.getQuestion();

        // 1단계: Retrieval - 관련 과일 정보 검색
        List<Fruit> relatedFruits = retrieveRelatedFruits(question);

        // 2단계: 검색된 정보를 컨텍스트로 구성
        String context = buildContext(relatedFruits);

        // 3단계: Generation - Gemini AI로 답변 생성
        String aiAnswer = generateAnswerWithGemini(question, context);

        // 4단계: 응답 구성
        return FruitDTO.AnswerResponse.builder()
                .question(question)
                .answer(aiAnswer)
                .relatedFruits(relatedFruits.stream()
                        .map(FruitDTO.Response::from)
                        .collect(Collectors.toList()))
                .build();
    }

    /**
     * 질문에서 키워드를 추출하여 관련 과일 검색
     */
    private List<Fruit> retrieveRelatedFruits(String question) {
        // 간단한 키워드 추출 (실제로는 더 정교한 NLP 기법 사용 가능)
        String[] keywords = question.split(" ");

        List<Fruit> results = fruitRepository.findAll(); // 기본적으로 모든 과일 가져오기

        // 키워드로 필터링
        for (String keyword : keywords) {
            List<Fruit> keywordResults = fruitRepository.searchByKeyword(keyword);
            if (!keywordResults.isEmpty()) {
                results = keywordResults;
                break; // 첫 번째 매칭되는 키워드 사용
            }
        }

        return results.stream().limit(5).collect(Collectors.toList()); // 최대 5개만 반환
    }

    /**
     * 검색된 과일 정보를 AI가 이해할 수 있는 컨텍스트로 구성
     */
    private String buildContext(List<Fruit> fruits) {
        if (fruits.isEmpty()) {
            return "현재 데이터베이스에 저장된 과일 정보가 없습니다.";
        }

        StringBuilder context = new StringBuilder();
        context.append("다음은 과일 데이터베이스에서 검색한 정보입니다:\n\n");

        for (Fruit fruit : fruits) {
            context.append(String.format(
                    "과일명: %s (%s)\n" +
                            "효능: %s\n" +
                            "영양소: %s\n" +
                            "설명: %s\n" +
                            "제철: %s\n" +
                            "원산지: %s\n\n",
                    fruit.getName(),
                    fruit.getEnglishName(),
                    fruit.getBenefits(),
                    fruit.getNutrients(),
                    fruit.getDescription(),
                    fruit.getSeason(),
                    fruit.getOrigin()));
        }

        return context.toString();
    }

    /**
     * Gemini AI API를 호출하여 답변 생성
     */
    private String generateAnswerWithGemini(String question, String context) {
        try {
            // API 키 확인
            if (geminiApiKey == null || geminiApiKey.isEmpty() || geminiApiKey.startsWith("${")) {
                log.error("Gemini API 키가 설정되지 않았습니다. application.properties를 확인하세요.");
                return "죄송합니다. AI 서비스 설정이 올바르지 않습니다. 관리자에게 문의하세요.";
            }

            log.info("=== Gemini API 호출 시작 ===");
            log.info("질문: {}", question);

            // 프롬프트 구성: 컨텍스트 + 질문
            String prompt = String.format(
                    "당신은 과일 효능 전문가입니다. 다음 정보를 바탕으로 사용자의 질문에 친절하고 정확하게 답변해주세요.\\n\\n" +
                            "%s\\n" +
                            "질문: %s\\n\\n" +
                            "답변은 한국어로 작성하고, 위 데이터베이스 정보를 기반으로 구체적으로 설명해주세요.",
                    context,
                    question);

            // Gemini API 요청 본문 구성
            String requestBody = String.format("""
                    {
                        "contents": [{
                            "parts": [{
                                "text": "%s"
                            }]
                        }]
                    }
                    """, prompt.replace("\"", "\\\"").replace("\n", "\\n"));

            log.debug("요청 본문 길이: {} bytes", requestBody.length());

            // HTTP 클라이언트로 Gemini API 호출
            HttpClient client = HttpClient.newHttpClient();
            String apiUrl = GEMINI_API_URL + "?key=" + geminiApiKey;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            log.info("Gemini API 호출 중...");
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            log.info("Gemini API 응답 상태 코드: {}", response.statusCode());
            log.debug("Gemini API 응답 본문: {}", response.body());

            // 응답 파싱
            if (response.statusCode() == 200) {
                String answer = parseGeminiResponse(response.body());
                log.info("=== Gemini API 호출 성공 ===");
                return answer;
            } else {
                log.error("Gemini API 호출 실패 - 상태 코드: {}", response.statusCode());
                log.error("응답 본문: {}", response.body());

                // 상세한 에러 메시지 반환
                return String.format("죄송합니다. AI 답변 생성 중 오류가 발생했습니다. (상태 코드: %d)\\n" +
                        "관리자에게 문의하세요.", response.statusCode());
            }

        } catch (Exception e) {
            log.error("=== Gemini API 호출 중 예외 발생 ===", e);
            log.error("예외 타입: {}", e.getClass().getName());
            log.error("예외 메시지: {}", e.getMessage());

            return String.format("죄송합니다. AI 답변 생성 중 오류가 발생했습니다.\\n" +
                    "오류 내용: %s\\n" +
                    "관리자에게 문의하세요.", e.getMessage());
        }
    }

    /**
     * Gemini API 응답에서 텍스트 추출
     */
    private String parseGeminiResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            return root.path("candidates")
                    .get(0)
                    .path("content")
                    .path("parts")
                    .get(0)
                    .path("text")
                    .asText();
        } catch (Exception e) {
            log.error("Gemini 응답 파싱 실패", e);
            return "응답 파싱 중 오류가 발생했습니다.";
        }
    }

    /**
     * 모든 과일 목록 조회
     */
    public List<FruitDTO.Response> getAllFruits() {
        return fruitRepository.findAll().stream()
                .map(FruitDTO.Response::from)
                .collect(Collectors.toList());
    }

    /**
     * 과일 정보 저장 (관리자용)
     */
    @Transactional
    public FruitDTO.Response saveFruit(Fruit fruit) {
        Fruit saved = fruitRepository.save(fruit);
        return FruitDTO.Response.from(saved);
    }
}
