# 🍎 과일 효능 AI - RAG 시스템

Gemini AI를 활용한 RAG(Retrieval-Augmented Generation) 기반 과일 효능 검색 시스템입니다.

## 📋 개요

이 시스템은 사용자가 과일에 대해 질문하면, 데이터베이스에서 관련 정보를 검색하고 Gemini AI가 해당 정보를 바탕으로 정확한 답변을 생성합니다.

### RAG란?

RAG(Retrieval-Augmented Generation)는 대규모 언어 모델(LLM)이 단독으로 답변을 생성하는 것이 아니라:

1. **Retrieval**: 외부 데이터베이스에서 관련 정보를 먼저 검색
2. **Augmented**: 검색된 정보를 AI에게 컨텍스트로 제공
3. **Generation**: AI가 컨텍스트 기반으로 정확한 답변 생성

## 🏗️ 시스템 구조

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   사용자    │ ───▶ │   Frontend   │ ───▶ │   Backend   │
│   질문      │      │   (React)    │      │ (Spring)    │
└─────────────┘      └──────────────┘      └─────────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │ 1. DB에서 검색  │
                                          │ (Retrieval)     │
                                          └─────────────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │ 2. Gemini API   │
                                          │ 호출 (Generation)│
                                          └─────────────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │ 3. 답변 반환    │
                                          └─────────────────┘
```

## 🚀 사용 방법

### 1. Backend 설정

#### application.properties 확인

```properties
# Gemini AI API 키 설정
gemini.api.key=${GEMINI_API_KEY:AIzaSyBXBjQo-ZBiMmZaJy6KDUjS296BB3vBwDk}
```

#### 서버 실행

```bash
cd backend
./mvnw spring-boot:run
```

서버가 시작되면 자동으로 8개의 과일 샘플 데이터가 추가됩니다:

- 사과, 바나나, 오렌지, 딸기, 키위, 블루베리, 수박, 포도

### 2. Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173/fruit-ai` 접속

### 3. 사용 예시

#### 질문 예시:

- "비타민C가 많은 과일은?"
- "소화에 좋은 과일 추천해줘"
- "운동 후 먹으면 좋은 과일은?"
- "피부에 좋은 과일 알려줘"
- "면역력 강화에 도움되는 과일은?"

#### AI 답변 예시:

```
질문: 비타민C가 많은 과일은?

답변: 비타민C가 풍부한 과일로는 다음과 같은 것들이 있습니다:

1. **오렌지**: 하루 권장량의 100% 이상을 제공하는 대표적인 비타민C 과일입니다.
2. **키위**: 오렌지보다도 비타민C 함량이 높으며, 중간 크기 키위 하나로 하루 권장량을 충족할 수 있습니다.
3. **딸기**: 비타민C가 매우 풍부하며, 8개 정도면 하루 권장량을 섭취할 수 있습니다.

이 과일들은 모두 강력한 항산화 작용을 하여 면역력 강화와 피부 건강에 도움을 줍니다.

참고한 과일 정보:
- 오렌지: 비타민C, 비타민A, 엽산, 칼륨, 식이섬유
- 키위: 비타민C, 비타민K, 비타민E, 식이섬유, 액티니딘
- 딸기: 비타민C, 망간, 엽산, 안토시아닌
```

## 📁 파일 구조

### Backend

```
src/main/java/kr/pe/tn/domain/fruit/
├── entity/
│   └── Fruit.java              # 과일 정보 엔티티
├── repository/
│   └── FruitRepository.java    # 과일 검색 Repository
├── dto/
│   └── FruitDTO.java           # 요청/응답 DTO
├── service/
│   ├── FruitRAGService.java    # RAG 핵심 로직
│   └── FruitDataInitializer.java # 초기 데이터 추가
└── api/
    └── FruitController.java    # REST API 컨트롤러
```

### Frontend

```
src/pages/
└── FruitAIPage.jsx             # 과일 AI 검색 페이지
```

## 🔧 API 엔드포인트

### 1. RAG 질문 답변

```http
POST /api/fruits/ask
Content-Type: application/json

{
  "question": "비타민C가 많은 과일은?"
}
```

**응답:**

```json
{
  "question": "비타민C가 많은 과일은?",
  "answer": "AI가 생성한 답변...",
  "relatedFruits": [
    {
      "id": 3,
      "name": "오렌지",
      "englishName": "Orange",
      "benefits": "면역력 강화, 피부 건강...",
      "nutrients": "비타민C, 비타민A...",
      "description": "...",
      "season": "겨울 (12월~2월)",
      "origin": "중국 남부"
    }
  ]
}
```

### 2. 모든 과일 목록 조회

```http
GET /api/fruits
```

### 3. 과일 정보 추가 (관리자용)

```http
POST /api/fruits
Content-Type: application/json

{
  "name": "망고",
  "englishName": "Mango",
  "benefits": "비타민A 풍부, 소화 촉진",
  "nutrients": "비타민A, 비타민C, 식이섬유",
  "description": "열대 과일의 왕",
  "season": "여름",
  "origin": "인도"
}
```

## 🔐 보안

API 키는 환경 변수로 관리하는 것을 권장합니다:

```bash
# Linux/Mac
export GEMINI_API_KEY=your_api_key_here

# Windows
set GEMINI_API_KEY=your_api_key_here
```

## 🎯 핵심 기능

1. **자연어 질문 처리**: 사용자가 자연스러운 한국어로 질문
2. **관련 정보 검색**: 데이터베이스에서 키워드 기반 검색
3. **컨텍스트 제공**: 검색된 정보를 Gemini AI에 제공
4. **정확한 답변 생성**: AI가 컨텍스트 기반으로 답변 생성
5. **출처 표시**: 답변에 사용된 과일 정보 카드 표시

## 📊 데이터베이스 스키마

```sql
CREATE TABLE fruits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    english_name VARCHAR(100) NOT NULL,
    benefits TEXT,
    nutrients TEXT,
    description TEXT,
    season VARCHAR(100),
    origin VARCHAR(50)
);
```

## 🌟 향후 개선 사항

- [ ] 더 정교한 키워드 추출 (NLP 기법 적용)
- [ ] 벡터 데이터베이스 연동 (Semantic Search)
- [ ] 대화 히스토리 저장
- [ ] 이미지 검색 기능 추가
- [ ] 다국어 지원

## 📝 라이선스

MIT License

## 👨‍💻 개발자

TerminalNexus Team
