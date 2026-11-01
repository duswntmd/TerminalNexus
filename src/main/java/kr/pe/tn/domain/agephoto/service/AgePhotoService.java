package kr.pe.tn.domain.agephoto.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.pe.tn.domain.agephoto.entity.AgePhotoUsageEntity;
import kr.pe.tn.domain.agephoto.repository.AgePhotoUsageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * 인물 사진으로 어린 시절·노년 모습을 만든다. 사진과 결과물은 저장하지 않는다.
 * 비용이 드는 API라 사용자별·전체 하루 한도를 두고, 프롬프트는 서버에 고정해 사용자 문구를 받지 않는다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgePhotoService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final int MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
    private static final int MAX_CONCURRENT = 2;

    private static final String COMMON = " Keep the same person's recognizable features, face shape, eye shape, skin tone, "
            + "pose, framing and lighting. Show a tasteful head-and-shoulders portrait in modest everyday clothing "
            + "with a plain background. Make it look like a natural photograph.";
    private static final Map<String, String> PROMPTS = Map.of(
            "young", "Edit this portrait to show how this same person may have looked as a child of about 8 years old, "
                    + "in a wholesome family-album school-photo style." + COMMON,
            "old", "Edit this portrait to show how this same person may look at about 75 years old, "
                    + "with natural signs of aging such as wrinkles and gray hair." + COMMON);

    private final AgePhotoUsageRepository usageRepository;
    private final TransactionTemplate tx;
    private final ObjectMapper objectMapper;

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final Semaphore slots = new Semaphore(MAX_CONCURRENT);
    private final Object usageLock = new Object();

    @Value("${age.photo.enabled:false}")
    private boolean enabled;
    @Value("${age.photo.user-daily-limit:6}")
    private int userDailyLimit;
    @Value("${age.photo.total-daily-limit:60}")
    private int totalDailyLimit;
    @Value("${age.photo.api-url:https://generativelanguage.googleapis.com/v1beta/models}")
    private String apiUrl;
    @Value("${age.photo.model:gemini-2.5-flash-image}")
    private String model;
    @Value("${gemini.api.key}")
    private String apiKey;

    public record Info(boolean enabled, int dailyLimit, int remaining) {
    }

    public record Result(String mimeType, String imageBase64, int remaining) {
    }

    private static LocalDate today() {
        return LocalDate.now(KST);
    }

    private int used(Long userId) {
        return usageRepository.findByUserIdAndUsageDate(userId, today()).map(AgePhotoUsageEntity::getUsed).orElse(0);
    }

    public Info info(Long userId) {
        return new Info(enabled, userDailyLimit, Math.max(0, userDailyLimit - used(userId)));
    }

    public Result generate(Long userId, String target, byte[] upload, boolean consent) {
        if (!enabled) throw new IllegalStateException("지금은 이용할 수 없는 기능입니다.");
        if (!consent) throw new IllegalArgumentException("사진 전송과 이용 조건에 동의해 주세요.");
        String prompt = PROMPTS.get(target);
        if (prompt == null) throw new IllegalArgumentException("잘못된 변환 종류입니다.");
        if (upload == null || upload.length == 0) throw new IllegalArgumentException("사진을 선택해 주세요.");
        if (upload.length > MAX_UPLOAD_BYTES) throw new IllegalArgumentException("사진은 10MB 이하만 사용할 수 있습니다.");
        byte[] photo = AgePhotoImage.sanitize(upload);

        boolean acquired = false;
        try {
            acquired = slots.tryAcquire(20, TimeUnit.SECONDS);
            if (!acquired) throw new IllegalStateException("사용자가 많습니다. 잠시 후 다시 시도해 주세요.");
            reserve(userId);
            try {
                JsonNode image = callModel(prompt, photo);
                return new Result(image.path("mimeType").asText("image/png"), image.path("data").asText(), info(userId).remaining());
            } catch (RuntimeException e) {
                release(userId); // 실패한 시도는 횟수에서 뺀다
                throw e;
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("요청이 중단되었습니다.");
        } finally {
            if (acquired) slots.release();
        }
    }

    /** 한도 확인과 증가가 끼어들지 않도록 잠금 안에서 트랜잭션을 끝낸다 */
    private void reserve(Long userId) {
        synchronized (usageLock) {
            tx.executeWithoutResult(status -> {
                if (usageRepository.totalOn(today()) >= totalDailyLimit) {
                    throw new IllegalStateException("오늘 준비된 생성량을 모두 사용했습니다. 내일 다시 이용해 주세요.");
                }
                AgePhotoUsageEntity usage = usageRepository.findByUserIdAndUsageDate(userId, today())
                        .orElseGet(() -> new AgePhotoUsageEntity(userId, today()));
                if (usage.getUsed() >= userDailyLimit) {
                    throw new IllegalStateException("오늘 이용 횟수를 모두 사용했습니다. 내일 다시 이용해 주세요.");
                }
                usage.add(1);
                usageRepository.save(usage);
            });
        }
    }

    private void release(Long userId) {
        synchronized (usageLock) {
            tx.executeWithoutResult(status -> usageRepository.findByUserIdAndUsageDate(userId, today()).ifPresent(u -> u.add(-1)));
        }
    }

    private JsonNode callModel(String prompt, byte[] photo) {
        try {
            String body = objectMapper.writeValueAsString(Map.of(
                    "contents", List.of(Map.of("parts", List.of(
                            Map.of("text", prompt),
                            Map.of("inlineData", Map.of("mimeType", "image/jpeg", "data", Base64.getEncoder().encodeToString(photo)))))),
                    "generationConfig", Map.of("responseModalities", List.of("IMAGE"))));
            HttpRequest request = HttpRequest.newBuilder(URI.create(apiUrl + "/" + model + ":generateContent"))
                    .timeout(Duration.ofSeconds(90))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("이미지 생성 API 실패: status={}", response.statusCode());
                throw new IllegalStateException(response.statusCode() == 429
                        ? "지금은 생성량이 부족합니다. 잠시 후 다시 시도해 주세요."
                        : "이미지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
            }
            return findImage(objectMapper.readTree(response.body()));
        } catch (IOException e) {
            log.warn("이미지 생성 API 통신 실패: {}", e.getClass().getSimpleName());
            throw new IllegalStateException("이미지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("요청이 중단되었습니다.");
        }
    }

    private JsonNode findImage(JsonNode root) {
        JsonNode candidate = root.path("candidates").path(0);
        for (JsonNode part : candidate.path("content").path("parts")) {
            if (part.path("inlineData").hasNonNull("data")) return part.path("inlineData");
        }
        // 안전 필터 등으로 이미지가 없을 때: 응답 사유만 남기고 내용은 기록하지 않는다
        log.info("이미지 생성 거절: finish={}, block={}", candidate.path("finishReason").asText(""),
                root.path("promptFeedback").path("blockReason").asText(""));
        throw new IllegalStateException("이 사진으로는 이미지를 만들지 못했습니다. 얼굴이 잘 보이는 다른 사진으로 시도해 주세요.");
    }
}
