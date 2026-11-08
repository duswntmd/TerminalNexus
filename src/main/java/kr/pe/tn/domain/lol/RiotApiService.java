package kr.pe.tn.domain.lol;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * 리그 오브 레전드 전적 검색 (Riot Games 공식 API 중계)
 * - API 키는 서버 환경변수 RIOT_API_KEY 로만 받는다 (브라우저에 노출하지 않음)
 * - Riot 요청 제한(개발 키: 1초 20회, 2분 100회)을 넘지 않도록 서버에서 먼저 막는다
 * - 같은 소환사를 여러 사람이 조회해도 Riot 호출이 늘지 않게 결과를 잠시 캐시한다
 * - 끝난 경기 상세는 바뀌지 않으므로 오래 캐시한다
 */
@Slf4j
@Service
public class RiotApiService {

    /** 서버(플랫폼) → 계정·경기 조회용 지역 */
    public static final Map<String, String> PLATFORMS = Map.of(
            "kr", "asia", "jp1", "asia",
            "na1", "americas", "br1", "americas", "la1", "americas", "la2", "americas",
            "euw1", "europe", "eun1", "europe", "tr1", "europe",
            "oc1", "sea");

    public static class RiotException extends RuntimeException {
        public final int status;
        public RiotException(int status, String message) { super(message); this.status = status; }
    }

    private record Entry(Object value, long expires) {}

    private final ObjectMapper om;
    private final RestTemplate http;
    private final String apiKey;
    private final Map<String, Entry> cache = new ConcurrentHashMap<>();
    /** 끝난 경기 상세 (최근 것 3,000개까지) */
    private final Map<String, JsonNode> matchCache = Collections.synchronizedMap(new LinkedHashMap<>(256, 0.75f, true) {
        @Override protected boolean removeEldestEntry(Map.Entry<String, JsonNode> e) { return size() > 3000; }
    });
    private final Deque<Long> sec = new ArrayDeque<>();
    private final Deque<Long> twoMin = new ArrayDeque<>();
    private final int perSecond;
    private final int perTwoMin;
    /** Riot 주소 틀. {host} 자리에 kr, asia 등이 들어간다 (시험할 때 가짜 서버로 바꿀 수 있게) */
    private final String baseUrl;

    public RiotApiService(ObjectMapper om,
                          @Value("${riot.api-key:}") String apiKey,
                          @Value("${riot.rate.per-second:18}") int perSecond,
                          @Value("${riot.rate.per-two-minutes:95}") int perTwoMin,
                          @Value("${riot.base-url:https://{host}.api.riotgames.com}") String baseUrl) {
        this.om = om;
        this.baseUrl = baseUrl;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.perSecond = perSecond;
        this.perTwoMin = perTwoMin;
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5_000);
        f.setReadTimeout(10_000);
        this.http = new RestTemplate(f);
    }

    public boolean configured() { return !apiKey.isEmpty(); }

    public static String platformOf(String p) { return PLATFORMS.containsKey(p) ? p : "kr"; }

    // ---------- 조회 ----------

    /** Riot ID(이름#태그)로 계정·소환사·랭크를 한 번에 */
    public ObjectNode profile(String platform, String name, String tag) {
        String pf = platformOf(platform);
        String region = PLATFORMS.get(pf);
        String key = "profile:" + pf + ":" + (name + "#" + tag).toLowerCase();
        return cached(key, Duration.ofMinutes(2), () -> {
            JsonNode acc = get(region, "/riot/account/v1/accounts/by-riot-id/" + enc(name) + "/" + enc(tag));
            String puuid = acc.path("puuid").asText();
            JsonNode sum = get(pf, "/lol/summoner/v4/summoners/by-puuid/" + puuid);
            JsonNode league = league(pf, puuid);
            ObjectNode out = om.createObjectNode();
            out.put("puuid", puuid);
            out.put("gameName", acc.path("gameName").asText(name));
            out.put("tagLine", acc.path("tagLine").asText(tag));
            out.put("platform", pf);
            out.put("profileIconId", sum.path("profileIconId").asInt());
            out.put("summonerLevel", sum.path("summonerLevel").asInt());
            out.set("ranks", league);
            out.put("fetchedAt", System.currentTimeMillis());
            return out;
        });
    }

    /** 랭크 정보 (솔로·자유). 프로필·인게임 화면이 같이 쓴다 */
    public ArrayNode league(String platform, String puuid) {
        String pf = platformOf(platform);
        return cached("league:" + pf + ":" + puuid, Duration.ofMinutes(5), () -> {
            ArrayNode ranks = om.createArrayNode();
            for (JsonNode l : get(pf, "/lol/league/v4/entries/by-puuid/" + enc(puuid))) {
                ObjectNode r = ranks.addObject();
                r.put("queue", l.path("queueType").asText());
                r.put("tier", l.path("tier").asText());
                r.put("rank", l.path("rank").asText());
                r.put("lp", l.path("leaguePoints").asInt());
                r.put("wins", l.path("wins").asInt());
                r.put("losses", l.path("losses").asInt());
                r.put("hotStreak", l.path("hotStreak").asBoolean());
            }
            return ranks;
        });
    }

    /** 숙련도 높은 챔피언 */
    public ArrayNode mastery(String platform, String puuid, int count) {
        String pf = platformOf(platform);
        int n = Math.max(1, Math.min(count, 20));
        return cached("mastery:" + pf + ":" + puuid + ":" + n, Duration.ofMinutes(10), () -> {
            ArrayNode out = om.createArrayNode();
            for (JsonNode m : get(pf, "/lol/champion-mastery/v4/champion-masteries/by-puuid/" + enc(puuid) + "/top?count=" + n)) {
                out.addObject()
                        .put("championId", m.path("championId").asInt())
                        .put("level", m.path("championLevel").asInt())
                        .put("points", m.path("championPoints").asLong())
                        .put("lastPlay", m.path("lastPlayTime").asLong());
            }
            return out;
        });
    }

    /** 챌린저·그랜드마스터 순위 (LP 순). 이름은 보이는 쪽만 계정 API로 찾는다 */
    public ObjectNode ladder(String platform, String queue, int page, int size) {
        String pf = platformOf(platform);
        String q = "RANKED_FLEX_SR".equals(queue) ? "RANKED_FLEX_SR" : "RANKED_SOLO_5x5";
        ArrayNode all = cached("ladder:" + pf + ":" + q, Duration.ofMinutes(30), () -> {
            List<ObjectNode> rows = new ArrayList<>();
            for (String[] t : new String[][]{{"CHALLENGER", "challengerleagues"}, {"GRANDMASTER", "grandmasterleagues"}}) {
                JsonNode l = get(pf, "/lol/league/v4/" + t[1] + "/by-queue/" + q);
                for (JsonNode e : l.path("entries")) {
                    ObjectNode o = om.createObjectNode();
                    o.put("puuid", e.path("puuid").asText());
                    o.put("tier", t[0]);
                    o.put("lp", e.path("leaguePoints").asInt());
                    o.put("wins", e.path("wins").asInt());
                    o.put("losses", e.path("losses").asInt());
                    o.put("hotStreak", e.path("hotStreak").asBoolean());
                    rows.add(o);
                }
            }
            rows.sort((a, b) -> b.path("lp").asInt() - a.path("lp").asInt());
            ArrayNode arr = om.createArrayNode();
            arr.addAll(rows);
            return arr;
        });
        int sz = Math.max(1, Math.min(size, 50));
        int from = Math.max(0, page) * sz;
        ObjectNode out = om.createObjectNode();
        out.put("total", all.size());
        out.put("page", Math.max(0, page));
        out.put("size", sz);
        ArrayNode list = out.putArray("entries");
        String region = PLATFORMS.get(pf);
        for (int i = from; i < Math.min(all.size(), from + sz); i++) {
            ObjectNode o = all.get(i).deepCopy();
            o.put("rank", i + 1);
            try {
                JsonNode acc = account(region, o.path("puuid").asText());
                o.put("gameName", acc.path("gameName").asText(""));
                o.put("tagLine", acc.path("tagLine").asText(""));
            } catch (RiotException e) {
                if (e.status == 429 || e.status == 503) { o.put("gameName", ""); o.put("tagLine", ""); }
                else throw e;
            }
            list.add(o);
        }
        return out;
    }

    /** puuid → Riot ID (이름은 잘 안 바뀌므로 하루 캐시) */
    private JsonNode account(String region, String puuid) {
        return cached("acc:" + puuid, Duration.ofHours(24), () -> get(region, "/riot/account/v1/accounts/by-puuid/" + enc(puuid)));
    }

    /** 최근 경기 목록(요약). queue: 420 솔로랭크, 440 자유랭크, 450 칼바람, 400 일반 등 */
    public ArrayNode matches(String platform, String puuid, int start, int count, Integer queue) {
        String pf = platformOf(platform);
        String region = PLATFORMS.get(pf);
        int cnt = Math.max(1, Math.min(count, 20));
        String q = "?start=" + Math.max(0, start) + "&count=" + cnt + (queue != null ? "&queue=" + queue : "");
        JsonNode ids = cached("ids:" + pf + ":" + puuid + q, Duration.ofSeconds(90),
                () -> (ArrayNode) get(region, "/lol/match/v5/matches/by-puuid/" + enc(puuid) + "/ids" + q));
        List<String> list = new ArrayList<>();
        ids.forEach(n -> list.add(n.asText()));
        ArrayNode out = om.createArrayNode();
        try (var ex = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<JsonNode>> fs = new ArrayList<>();
            for (String id : list) fs.add(ex.submit(() -> match(region, id)));
            for (Future<JsonNode> f : fs) {
                try {
                    JsonNode m = f.get();
                    if (m != null) out.add(m);
                } catch (java.util.concurrent.ExecutionException e) {
                    // 한도·키 문제는 알리고, 경기 하나가 잠깐 실패한 것은 그 경기만 빼고 보여 준다
                    if (e.getCause() instanceof RiotException re && (re.status == 429 || re.status == 503)) throw re;
                    log.warn("경기 조회 실패: {}", e.getCause().getMessage());
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return out;
    }

    /** 지금 하고 있는 게임. 게임 중이 아니면 inGame=false */
    public ObjectNode live(String platform, String puuid) {
        String pf = platformOf(platform);
        return cached("live:" + pf + ":" + puuid, Duration.ofSeconds(30), () -> {
            ObjectNode out = om.createObjectNode();
            try {
                JsonNode g = get(pf, "/lol/spectator/v5/active-games/by-summoner/" + enc(puuid));
                out.put("inGame", true);
                out.put("gameMode", g.path("gameMode").asText());
                out.put("queueId", g.path("gameQueueConfigId").asInt());
                out.put("gameStartTime", g.path("gameStartTime").asLong());
                out.put("gameLength", g.path("gameLength").asLong());
                ArrayNode ps = out.putArray("participants");
                for (JsonNode p : g.path("participants")) {
                    ObjectNode o = ps.addObject();
                    o.put("puuid", p.path("puuid").asText(""));
                    o.put("riotId", p.path("riotId").asText(""));
                    o.put("championId", p.path("championId").asInt());
                    o.put("teamId", p.path("teamId").asInt());
                    o.put("spell1Id", p.path("spell1Id").asInt());
                    o.put("spell2Id", p.path("spell2Id").asInt());
                    o.put("perk0", p.path("perks").path("perkIds").path(0).asInt());
                    o.put("perkSub", p.path("perks").path("perkSubStyle").asInt());
                }
                // 참가자 랭크 (요청 한도에 걸리면 비워 둔다)
                try (var ex = Executors.newVirtualThreadPerTaskExecutor()) {
                    List<Future<?>> fs = new ArrayList<>();
                    for (JsonNode p : ps) {
                        String id = p.path("puuid").asText("");
                        if (id.isEmpty()) continue;
                        fs.add(ex.submit(() -> {
                            try {
                                for (JsonNode r : league(pf, id)) {
                                    if ("RANKED_SOLO_5x5".equals(r.path("queue").asText())) ((ObjectNode) p).set("solo", r);
                                }
                            } catch (RiotException e) { /* 랭크 없이 표시 */ }
                        }));
                    }
                    for (Future<?> f : fs) { try { f.get(); } catch (Exception ignore) { /* 위에서 처리 */ } }
                }
                ArrayNode bans = out.putArray("bans");
                for (JsonNode b : g.path("bannedChampions")) {
                    bans.addObject().put("championId", b.path("championId").asInt()).put("teamId", b.path("teamId").asInt());
                }
            } catch (RiotException e) {
                if (e.status != 404) throw e;
                out.put("inGame", false);
            }
            return out;
        });
    }

    /** 이번 주 무료 챔피언 */
    public JsonNode rotation(String platform) {
        String pf = platformOf(platform);
        return cached("rotation:" + pf, Duration.ofHours(1), () -> (ObjectNode) get(pf, "/lol/platform/v3/champion-rotations"));
    }

    // ---------- 경기 상세 (필요한 필드만) ----------

    private JsonNode match(String region, String id) {
        JsonNode hit = matchCache.get(id);
        if (hit != null) return hit;
        JsonNode m = get(region, "/lol/match/v5/matches/" + enc(id));
        JsonNode info = m.path("info");
        ObjectNode o = om.createObjectNode();
        o.put("id", id);
        o.put("queueId", info.path("queueId").asInt());
        o.put("gameMode", info.path("gameMode").asText());
        o.put("start", info.path("gameStartTimestamp").asLong(info.path("gameCreation").asLong()));
        o.put("end", info.path("gameEndTimestamp").asLong());
        o.put("duration", info.path("gameDuration").asLong());
        o.put("version", info.path("gameVersion").asText());
        ArrayNode teams = o.putArray("teams");
        for (JsonNode t : info.path("teams")) {
            ObjectNode tt = teams.addObject();
            tt.put("teamId", t.path("teamId").asInt());
            tt.put("win", t.path("win").asBoolean());
            JsonNode ob = t.path("objectives");
            tt.put("kills", ob.path("champion").path("kills").asInt());
            tt.put("baron", ob.path("baron").path("kills").asInt());
            tt.put("dragon", ob.path("dragon").path("kills").asInt());
            tt.put("tower", ob.path("tower").path("kills").asInt());
            tt.put("horde", ob.path("horde").path("kills").asInt());
            ArrayNode bans = tt.putArray("bans");
            for (JsonNode b : t.path("bans")) bans.add(b.path("championId").asInt());
        }
        ArrayNode ps = o.putArray("participants");
        for (JsonNode p : info.path("participants")) {
            ObjectNode x = ps.addObject();
            x.put("puuid", p.path("puuid").asText());
            x.put("name", p.path("riotIdGameName").asText(p.path("summonerName").asText()));
            x.put("tag", p.path("riotIdTagline").asText(""));
            x.put("championId", p.path("championId").asInt());
            x.put("championName", p.path("championName").asText());
            x.put("champLevel", p.path("champLevel").asInt());
            x.put("teamId", p.path("teamId").asInt());
            x.put("position", p.path("teamPosition").asText(""));
            x.put("win", p.path("win").asBoolean());
            x.put("kills", p.path("kills").asInt());
            x.put("deaths", p.path("deaths").asInt());
            x.put("assists", p.path("assists").asInt());
            x.put("cs", p.path("totalMinionsKilled").asInt() + p.path("neutralMinionsKilled").asInt());
            x.put("gold", p.path("goldEarned").asInt());
            x.put("damage", p.path("totalDamageDealtToChampions").asInt());
            x.put("taken", p.path("totalDamageTaken").asInt());
            x.put("vision", p.path("visionScore").asInt());
            x.put("wards", p.path("wardsPlaced").asInt());
            x.put("pinkWards", p.path("visionWardsBoughtInGame").asInt());
            x.put("multiKill", p.path("largestMultiKill").asInt());
            x.put("remake", p.path("gameEndedInEarlySurrender").asBoolean());
            x.put("placement", p.path("placement").asInt());      // 아레나 순위
            x.put("subteam", p.path("playerSubteamId").asInt());  // 아레나 2인 조
            ArrayNode items = x.putArray("items");
            for (int i = 0; i <= 6; i++) items.add(p.path("item" + i).asInt());
            x.put("spell1", p.path("summoner1Id").asInt());
            x.put("spell2", p.path("summoner2Id").asInt());
            JsonNode styles = p.path("perks").path("styles");
            x.put("keystone", styles.path(0).path("selections").path(0).path("perk").asInt());
            x.put("subStyle", styles.path(1).path("style").asInt());
        }
        matchCache.put(id, o);
        return o;
    }

    // ---------- 공용 ----------

    @SuppressWarnings("unchecked")
    private <T> T cached(String key, Duration ttl, java.util.function.Supplier<T> loader) {
        Entry e = cache.get(key);
        long now = System.currentTimeMillis();
        if (e != null && e.expires > now) return (T) e.value;
        T v = loader.get();
        cache.put(key, new Entry(v, now + ttl.toMillis()));
        if (cache.size() > 5000) cache.entrySet().removeIf(x -> x.getValue().expires < now);
        return v;
    }

    private static String enc(String s) { return UriUtils.encodePathSegment(s, StandardCharsets.UTF_8); }

    /** 요청 제한: 1초 창은 잠깐 기다리고, 2분 창이 차면 바로 429 */
    private void acquire() {
        while (true) {
            long wait;
            synchronized (this) {
                long now = System.currentTimeMillis();
                while (!sec.isEmpty() && now - sec.peekFirst() >= 1_000) sec.pollFirst();
                while (!twoMin.isEmpty() && now - twoMin.peekFirst() >= 120_000) twoMin.pollFirst();
                if (twoMin.size() >= perTwoMin) {
                    throw new RiotException(429, "조회하는 사람이 많아 잠시 쉬고 있습니다. 1~2분 뒤 다시 시도해 주세요.");
                }
                if (sec.size() < perSecond) { sec.addLast(now); twoMin.addLast(now); return; }
                wait = 1_000 - (now - sec.peekFirst()) + 5;
            }
            try { Thread.sleep(wait); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); return; }
        }
    }

    private JsonNode get(String host, String path) {
        if (!configured()) throw new RiotException(503, "전적 검색이 아직 준비되지 않았습니다. (서버에 Riot API 키가 설정되지 않음)");
        acquire();
        HttpHeaders h = new HttpHeaders();
        h.set("X-Riot-Token", apiKey);
        String url = baseUrl.replace("{host}", host) + path;
        try {
            String body = http.exchange(java.net.URI.create(url), HttpMethod.GET, new HttpEntity<>(h), String.class).getBody();
            return om.readTree(body == null ? "null" : body);
        } catch (HttpClientErrorException e) {
            int s = e.getStatusCode().value();
            if (s == 404) throw new RiotException(404, "소환사나 경기를 찾을 수 없습니다. 이름과 태그를 확인해 주세요.");
            if (s == 429) throw new RiotException(429, "Riot 서버 요청 한도에 걸렸습니다. 잠시 뒤 다시 시도해 주세요.");
            if (s == 401 || s == 403) {
                log.warn("Riot API 키 거부 ({}): 키가 만료됐거나 잘못됨", s);
                throw new RiotException(503, "전적 검색 서버 키가 만료되었습니다. 관리자에게 알려 주세요.");
            }
            throw new RiotException(502, "Riot 서버 응답 오류 (" + s + ")");
        } catch (RiotException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Riot API 호출 실패 {}: {}", path, e.getMessage());
            throw new RiotException(502, "Riot 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        }
    }
}
