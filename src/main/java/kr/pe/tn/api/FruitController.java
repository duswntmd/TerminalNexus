package kr.pe.tn.api;

import kr.pe.tn.domain.fruit.dto.FruitDTO;
import kr.pe.tn.domain.fruit.entity.Fruit;
import kr.pe.tn.domain.fruit.service.FruitRAGService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 과일 효능 RAG API 컨트롤러
 * 
 * 엔드포인트:
 * - POST /api/fruits/ask : RAG 기반 질문 답변
 * - GET /api/fruits : 모든 과일 목록 조회
 * - POST /api/fruits : 과일 정보 추가 (관리자용)
 */
@Slf4j
@RestController
@RequestMapping("/api/fruits")
@RequiredArgsConstructor
public class FruitController {

    private final FruitRAGService fruitRAGService;

    /**
     * RAG 기반 질문 답변 API
     * 
     * 예시 요청:
     * POST /api/fruits/ask
     * {
     * "question": "비타민C가 많은 과일은 무엇인가요?"
     * }
     * 
     * 예시 응답:
     * {
     * "question": "비타민C가 많은 과일은 무엇인가요?",
     * "answer": "비타민C가 풍부한 과일로는 오렌지, 키위, 딸기 등이 있습니다...",
     * "relatedFruits": [...]
     * }
     */
    @PostMapping("/ask")
    public ResponseEntity<FruitDTO.AnswerResponse> askQuestion(
            @RequestBody FruitDTO.QuestionRequest request) {

        log.info("과일 효능 질문 수신: {}", request.getQuestion());

        FruitDTO.AnswerResponse response = fruitRAGService.answerQuestion(request);

        return ResponseEntity.ok(response);
    }

    /**
     * 모든 과일 목록 조회
     */
    @GetMapping
    public ResponseEntity<List<FruitDTO.Response>> getAllFruits() {
        List<FruitDTO.Response> fruits = fruitRAGService.getAllFruits();
        return ResponseEntity.ok(fruits);
    }

    /**
     * 과일 정보 추가 (관리자용)
     * 
     * 예시 요청:
     * POST /api/fruits
     * {
     * "name": "사과",
     * "englishName": "Apple",
     * "benefits": "항산화 효과, 심혈관 건강 개선",
     * "nutrients": "비타민C, 식이섬유, 칼륨",
     * "description": "사과는 세계에서 가장 인기 있는 과일 중 하나입니다.",
     * "season": "가을",
     * "origin": "중앙아시아"
     * }
     */
    @PostMapping
    public ResponseEntity<FruitDTO.Response> addFruit(@RequestBody Fruit fruit) {
        log.info("새로운 과일 정보 추가: {}", fruit.getName());

        FruitDTO.Response response = fruitRAGService.saveFruit(fruit);

        return ResponseEntity.ok(response);
    }
}
