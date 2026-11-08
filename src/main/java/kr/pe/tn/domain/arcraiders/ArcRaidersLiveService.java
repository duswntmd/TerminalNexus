package kr.pe.tn.domain.arcraiders;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * ARC Raiders 실시간 정보 (MetaForge 공개 API 중계)
 * - MetaForge 이용 조건: 직접 호출을 줄이고 캐시해서 쓸 것, 화면에 출처(metaforge.app/arc-raiders) 표시
 * - 그래서 서버가 받아 메모리에 두고, 브라우저는 이 서버만 호출한다 (MetaForge는 CORS도 막혀 있음)
 * - 갱신에 실패하면 마지막으로 받은 값을 그대로 돌려준다
 */
@Slf4j
@Service
public class ArcRaidersLiveService {

    private static final String BASE = "https://metaforge.app/api/arc-raiders";
    public static final Set<String> REGIONS = Set.of("east-asia", "north-america", "europe", "oceania", "brazil");

    private static final Duration EVENTS_TTL = Duration.ofMinutes(5);
    private static final Duration TRADERS_TTL = Duration.ofMinutes(10);
    private static final Duration DB_TTL = Duration.ofHours(6);

    /** 아이템 DB에서 뺄 외형 아이템 분류 */
    private static final Set<String> COSMETIC_TYPES = Set.of("Cosmetic", "Outfits", "Outfit", "Emote", "Charm", "Backpack Charm");

    private record Entry(JsonNode value, long fetchedAt) {}

    private final Map<String, Entry> cache = new ConcurrentHashMap<>();
    private final Map<String, Object> locks = new ConcurrentHashMap<>();
    private final ObjectMapper om;
    private final RestTemplate http;

    public ArcRaidersLiveService(ObjectMapper om) {
        this.om = om;
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5_000);
        f.setReadTimeout(20_000);
        this.http = new RestTemplate(f);
    }

    /** 맵 조건(이벤트) 일정. region 은 REGIONS 중 하나 */
    public JsonNode events(String region) {
        String r = REGIONS.contains(region) ? region : "east-asia";
        return cached("events:" + r, EVENTS_TTL, () -> {
            JsonNode src = get("/events-schedule?region=" + r);
            ObjectNode out = om.createObjectNode();
            out.put("region", src.path("region").asText(r));
            ArrayNode list = out.putArray("events");
            for (JsonNode e : src.path("data")) {
                ObjectNode o = list.addObject();
                o.put("name", e.path("name").asText());
                o.put("map", e.path("map").asText());
                o.put("icon", e.path("icon").asText(""));
                o.put("start", e.path("startTime").asLong());
                o.put("end", e.path("endTime").asLong());
            }
            return out;
        });
    }

    /** 상인별 현재 판매 목록 */
    public JsonNode traders() {
        return cached("traders", TRADERS_TTL, () -> {
            JsonNode src = get("/traders");
            ObjectNode out = om.createObjectNode();
            ArrayNode list = out.putArray("traders");
            src.path("data").fields().forEachRemaining((t) -> {
                ObjectNode tr = list.addObject();
                tr.put("name", t.getKey().equals("TianWen") ? "Tian Wen" : t.getKey());
                ArrayNode items = tr.putArray("items");
                for (JsonNode i : t.getValue()) {
                    ObjectNode o = items.addObject();
                    o.put("id", i.path("id").asText());
                    o.put("name", i.path("name").asText());
                    o.put("icon", i.path("icon").asText(""));
                    o.put("rarity", i.path("rarity").asText(""));
                    o.put("type", i.path("item_type").asText(""));
                    o.put("value", i.path("value").asInt());
                    o.put("price", i.path("trader_price").asInt());
                    o.put("desc", i.path("description").asText(""));
                }
            });
            return out;
        });
    }

    /** 아이템 전체 (외형 아이템 제외). 필드는 화면에 쓰는 것만 */
    public JsonNode items() {
        return cached("items", DB_TTL, () -> {
            ObjectNode out = om.createObjectNode();
            ArrayNode list = out.putArray("items");
            int page = 1;
            while (true) {
                JsonNode src = get("/items?limit=500&page=" + page);
                for (JsonNode i : src.path("data")) {
                    String type = i.path("item_type").asText("");
                    if (COSMETIC_TYPES.contains(type) || !i.path("cosmetic").isNull() && !i.path("cosmetic").isMissingNode()) continue;
                    ObjectNode o = list.addObject();
                    o.put("id", i.path("id").asText());
                    o.put("name", i.path("name").asText());
                    o.put("type", type);
                    o.put("rarity", i.path("rarity").asText(""));
                    o.put("value", i.path("value").asInt());
                    o.put("icon", i.path("icon").asText(""));
                    o.put("desc", i.path("description").asText(""));
                    o.put("area", i.path("loot_area").asText(""));
                    o.put("workbench", i.path("workbench").asText(""));
                    JsonNode sb = i.path("stat_block");
                    o.put("weight", sb.path("weight").asDouble());
                    o.put("stack", sb.path("stackSize").asInt());
                }
                if (!src.path("pagination").path("hasNextPage").asBoolean(false) || page >= 10) break;
                page++;
            }
            return out;
        });
    }

    /** 퀘스트 전체: 의뢰인, 목표, 제출 물품, 보상 */
    public JsonNode quests() {
        return cached("quests", DB_TTL, () -> {
            ObjectNode out = om.createObjectNode();
            ArrayNode list = out.putArray("quests");
            int page = 1;
            while (true) {
                JsonNode src = get("/quests?limit=100&page=" + page);
                for (JsonNode q : src.path("data")) {
                    ObjectNode o = list.addObject();
                    o.put("id", q.path("id").asText());
                    o.put("name", q.path("name").asText());
                    o.put("trader", q.path("trader_name").asText(""));
                    o.put("order", q.path("sort_order").asInt());
                    o.put("xp", q.path("xp").asInt());
                    o.set("objectives", q.path("objectives").isArray() ? q.path("objectives") : om.createArrayNode());
                    o.set("required", slimItems(q.path("required_items")));
                    o.set("rewards", slimItems(q.path("rewards")));
                }
                if (!src.path("pagination").path("hasNextPage").asBoolean(false) || page >= 10) break;
                page++;
            }
            return out;
        });
    }

    /** 주간 과제(Weekly Trials): 이번 주 진행 중인 것과 다음 주 예정 */
    public JsonNode trials() {
        return cached("trials", TRADERS_TTL, () -> {
            JsonNode src = get("/weekly-trials");
            ObjectNode out = om.createObjectNode();
            out.put("activeEnd", src.path("activeWindowEnd").asLong() * 1000);
            out.put("nextStart", src.path("nextWindowStart").asLong() * 1000);
            ArrayNode list = out.putArray("trials");
            for (JsonNode t : src.path("data")) {
                boolean active = t.path("is_active").asBoolean(), upcoming = t.path("upcoming").asBoolean();
                if (!active && !upcoming) continue;
                ObjectNode o = list.addObject();
                o.put("id", t.path("id").asText());
                o.put("name", t.path("name").asText());
                o.put("active", active);
                o.put("image", t.path("image_url").asText(""));
                o.put("guide", t.path("guide_link").asText(""));
                o.put("start", t.path("window_start").asLong() * 1000);
                o.put("end", t.path("window_end").asLong() * 1000);
                o.put("type", t.path("type").asText(""));
                ArrayNode maps = o.putArray("maps");
                for (JsonNode m : t.path("map_names")) maps.add(m.asText());
                o.put("order", t.path("sort_order").asInt());
            }
            return out;
        });
    }

    /** 작업대(Hideout) 단계별 업그레이드 재료와 해금 제작품 */
    public JsonNode hideout() {
        return cached("hideout", DB_TTL, () -> {
            JsonNode src = get("/hideout");
            ObjectNode out = om.createObjectNode();
            ArrayNode list = out.putArray("benches");
            for (JsonNode b : src) {
                ObjectNode o = list.addObject();
                o.put("id", b.path("id").asText());
                o.put("name", b.path("name").asText());
                o.put("maxLevel", b.path("maxLevel").asInt());
                ArrayNode levels = o.putArray("levels");
                for (int lv = 1; lv <= b.path("maxLevel").asInt(); lv++) {
                    JsonNode l = b.path("levels").path(String.valueOf(lv));
                    ObjectNode x = levels.addObject();
                    x.put("level", lv);
                    ArrayNode req = x.putArray("items");
                    for (JsonNode r : l.path("requiredItems")) {
                        // MetaForge 자료 오류 보정: 무기 작업대 1단계 재료가 '고무 부품 설계도'로 적혀 있음 (게임에서는 고무 부품)
                        String id = r.path("id").asText().replace("rubber-parts-recipe", "rubber-parts");
                        req.addObject().put("id", id).put("qty", r.path("quantity").asInt(1));
                    }
                    ArrayNode unlock = x.putArray("unlock");
                    for (JsonNode r : l.path("unlockRequirements")) unlock.addObject().put("id", r.path("id").asText()).put("qty", r.path("quantity").asInt(1));
                    ArrayNode crafts = x.putArray("crafts");
                    for (JsonNode c : l.path("crafts")) crafts.add(c.asText());
                }
            }
            return out;
        });
    }

    private ArrayNode slimItems(JsonNode arr) {
        ArrayNode out = om.createArrayNode();
        for (JsonNode r : arr) {
            JsonNode it = r.path("item");
            ObjectNode o = out.addObject();
            o.put("id", r.path("item_id").asText(it.path("id").asText()));
            o.put("name", it.path("name").asText());
            o.put("icon", it.path("icon").asText(""));
            o.put("rarity", it.path("rarity").asText(""));
            o.put("qty", r.path("quantity").asInt(1));
        }
        return out;
    }

    /** 캐시가 살아 있으면 그대로, 지났으면 새로 받는다. 실패하면 이전 값(없으면 예외) */
    private JsonNode cached(String key, Duration ttl, Supplier<ObjectNode> loader) {
        Entry e = cache.get(key);
        long now = System.currentTimeMillis();
        if (e != null && now - e.fetchedAt < ttl.toMillis()) return e.value;
        synchronized (locks.computeIfAbsent(key, k -> new Object())) {
            e = cache.get(key);
            if (e != null && System.currentTimeMillis() - e.fetchedAt < ttl.toMillis()) return e.value;
            try {
                ObjectNode v = loader.get();
                long at = System.currentTimeMillis();
                v.put("fetchedAt", at);
                v.put("source", "https://metaforge.app/arc-raiders");
                cache.put(key, new Entry(v, at));
                return v;
            } catch (Exception ex) {
                log.warn("MetaForge {} 갱신 실패: {}", key, ex.getMessage());
                if (e != null) {
                    // 1분 뒤 다시 시도하도록 시각만 당겨 둔다
                    cache.put(key, new Entry(e.value, System.currentTimeMillis() - ttl.toMillis() + 60_000));
                    return e.value;
                }
                throw new IllegalStateException("ARC Raiders 정보를 불러오지 못했습니다.");
            }
        }
    }

    private JsonNode get(String path) {
        HttpHeaders h = new HttpHeaders();
        h.set(HttpHeaders.USER_AGENT, "TerminalNexus/1.0 (+https://tnhub.kr/games/arc-raiders)");
        h.setAccept(List.of(org.springframework.http.MediaType.APPLICATION_JSON));
        String body = http.exchange(BASE + path, HttpMethod.GET, new HttpEntity<>(h), String.class).getBody();
        try {
            return om.readTree(body);
        } catch (Exception ex) {
            throw new IllegalStateException("응답 해석 실패: " + path, ex);
        }
    }
}
