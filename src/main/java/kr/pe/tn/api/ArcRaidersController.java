package kr.pe.tn.api;

import com.fasterxml.jackson.databind.JsonNode;
import kr.pe.tn.domain.arcraiders.ArcRaidersLiveService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * ARC Raiders 실시간 정보 API (로그인 불필요). 데이터 출처: MetaForge (metaforge.app/arc-raiders)
 */
@RestController
@RequestMapping("/api/arc")
@RequiredArgsConstructor
public class ArcRaidersController {

    private final ArcRaidersLiveService live;

    @GetMapping("/events")
    public ResponseEntity<JsonNode> events(@RequestParam(defaultValue = "east-asia") String region) {
        return ok(live.events(region), 60);
    }

    @GetMapping("/traders")
    public ResponseEntity<JsonNode> traders() {
        return ok(live.traders(), 300);
    }

    @GetMapping("/items")
    public ResponseEntity<JsonNode> items() {
        return ok(live.items(), 3600);
    }

    @GetMapping("/quests")
    public ResponseEntity<JsonNode> quests() {
        return ok(live.quests(), 3600);
    }

    @GetMapping("/trials")
    public ResponseEntity<JsonNode> trials() {
        return ok(live.trials(), 300);
    }

    @GetMapping("/hideout")
    public ResponseEntity<JsonNode> hideout() {
        return ok(live.hideout(), 3600);
    }

    private ResponseEntity<JsonNode> ok(JsonNode body, int seconds) {
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(seconds, TimeUnit.SECONDS).cachePublic()).body(body);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> upstreamDown(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("message", e.getMessage()));
    }
}
