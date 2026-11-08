package kr.pe.tn.api;

import com.fasterxml.jackson.databind.JsonNode;
import kr.pe.tn.domain.lol.RiotApiService;
import kr.pe.tn.domain.lol.RiotApiService.RiotException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * 리그 오브 레전드 전적 검색 API (로그인 불필요). 데이터: Riot Games API
 */
@RestController
@RequestMapping("/api/lol")
@RequiredArgsConstructor
public class LolController {

    private final RiotApiService riot;

    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of("configured", riot.configured());
    }

    @GetMapping("/summoner")
    public ResponseEntity<JsonNode> summoner(@RequestParam(defaultValue = "kr") String platform,
                                             @RequestParam String name, @RequestParam String tag) {
        String n = name.trim(), t = tag.trim().replaceFirst("^#", "");
        if (n.isEmpty() || n.length() > 32 || t.isEmpty() || t.length() > 8) {
            throw new RiotException(400, "이름#태그 형식으로 입력해 주세요. (예: Hide on bush#KR1)");
        }
        return ok(riot.profile(platform, n, t), 60);
    }

    @GetMapping("/matches")
    public ResponseEntity<JsonNode> matches(@RequestParam(defaultValue = "kr") String platform, @RequestParam String puuid,
                                            @RequestParam(defaultValue = "0") int start, @RequestParam(defaultValue = "10") int count,
                                            @RequestParam(required = false) Integer queue) {
        if (puuid.length() > 100) throw new RiotException(400, "잘못된 요청입니다.");
        return ok(riot.matches(platform, puuid, start, count, queue), 60);
    }

    @GetMapping("/live")
    public ResponseEntity<JsonNode> live(@RequestParam(defaultValue = "kr") String platform, @RequestParam String puuid) {
        if (puuid.length() > 100) throw new RiotException(400, "잘못된 요청입니다.");
        return ok(riot.live(platform, puuid), 20);
    }

    @GetMapping("/mastery")
    public ResponseEntity<JsonNode> mastery(@RequestParam(defaultValue = "kr") String platform, @RequestParam String puuid,
                                            @RequestParam(defaultValue = "10") int count) {
        if (puuid.length() > 100) throw new RiotException(400, "잘못된 요청입니다.");
        return ok(riot.mastery(platform, puuid, count), 300);
    }

    @GetMapping("/ranking")
    public ResponseEntity<JsonNode> ranking(@RequestParam(defaultValue = "kr") String platform,
                                            @RequestParam(defaultValue = "RANKED_SOLO_5x5") String queue,
                                            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        if (page > 200) throw new RiotException(400, "잘못된 요청입니다.");
        return ok(riot.ladder(platform, queue, page, size), 600);
    }

    @GetMapping("/rotation")
    public ResponseEntity<JsonNode> rotation(@RequestParam(defaultValue = "kr") String platform) {
        return ok(riot.rotation(platform), 1800);
    }

    private ResponseEntity<JsonNode> ok(JsonNode body, int seconds) {
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(seconds, TimeUnit.SECONDS).cachePublic()).body(body);
    }

    @ExceptionHandler(RiotException.class)
    public ResponseEntity<Map<String, String>> riotError(RiotException e) {
        return ResponseEntity.status(e.status).body(Map.of("message", e.getMessage()));
    }
}
