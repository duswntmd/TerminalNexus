package kr.pe.tn.domain.lol;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Riot API 와 같은 모양의 응답(src/test/resources/riot)을 돌려주는 가짜 서버로
 * 응답 해석, 오류 처리, 캐시가 맞는지 확인한다.
 */
class RiotApiServiceTest {

    static HttpServer server;
    static final List<String> hits = new ArrayList<>();
    static RiotApiService riot;
    static final String ME = "test-puuid-hide-on-bush-0000000000000000000000000000000000000000000000000000000000";

    @BeforeAll
    static void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", ex -> {
            String path = ex.getRequestURI().getRawPath();
            synchronized (hits) { hits.add(path); }
            String key = ex.getRequestHeaders().getFirst("X-Riot-Token");
            String file = null;
            int status = 200;
            if (!"test-key".equals(key)) status = 403;
            else if (path.matches("/asia/riot/account/v1/accounts/by-riot-id/Hide%20on%20bush/KR1")) file = "account.json";
            else if (path.startsWith("/asia/riot/account/v1/accounts/by-riot-id/")) status = 404;
            else if (path.startsWith("/asia/riot/account/v1/accounts/by-puuid/")) {
                String p = path.substring(path.lastIndexOf('/') + 1);
                byte[] b = ("{\"puuid\":\"" + p + "\",\"gameName\":\"name-" + p.hashCode() + "\",\"tagLine\":\"KR1\"}").getBytes(StandardCharsets.UTF_8);
                ex.sendResponseHeaders(200, b.length);
                ex.getResponseBody().write(b);
                ex.close();
                return;
            }
            else if (path.startsWith("/kr/lol/summoner/v4/summoners/by-puuid/")) file = "summoner.json";
            else if (path.startsWith("/kr/lol/league/v4/entries/by-puuid/" + ME)) file = "league.json";
            else if (path.startsWith("/kr/lol/league/v4/entries/by-puuid/")) file = null;
            else if (path.matches("/asia/lol/match/v5/matches/by-puuid/.+/ids")) file = "ids.json";
            else if (path.startsWith("/asia/lol/match/v5/matches/")) file = "match-" + path.substring(path.lastIndexOf('/') + 1) + ".json";
            else if (path.equals("/kr/lol/spectator/v5/active-games/by-summoner/" + ME)) file = "active.json";
            else if (path.startsWith("/kr/lol/spectator/v5/active-games/by-summoner/")) status = 404;
            else if (path.startsWith("/kr/lol/champion-mastery/v4/")) file = "mastery.json";
            else if (path.equals("/kr/lol/platform/v3/champion-rotations")) file = "rotation.json";
            else if (path.startsWith("/kr/lol/league/v4/challengerleagues/")) file = "challenger.json";
            else if (path.startsWith("/kr/lol/league/v4/grandmasterleagues/")) file = "grandmaster.json";
            else status = 404;
            byte[] body;
            if (status == 200 && file == null) body = "[]".getBytes();
            else if (status == 200) {
                try (InputStream in = RiotApiServiceTest.class.getResourceAsStream("/riot/" + file)) {
                    if (in == null) { status = 404; body = "{}".getBytes(); }
                    else body = in.readAllBytes();
                }
            } else body = "{\"status\":{\"status_code\":404}}".getBytes();
            ex.sendResponseHeaders(status, body.length);
            ex.getResponseBody().write(body);
            ex.close();
        });
        server.start();
        String base = "http://127.0.0.1:" + server.getAddress().getPort() + "/{host}";
        riot = new RiotApiService(new ObjectMapper(), "test-key", 18, 1000, base);
    }

    @AfterAll
    static void stop() { server.stop(0); }

    @Test
    void profileReadsAccountSummonerAndRanks() {
        JsonNode p = riot.profile("kr", "Hide on bush", "KR1");
        assertEquals(ME, p.path("puuid").asText());
        assertEquals("Hide on bush", p.path("gameName").asText());
        assertEquals(812, p.path("summonerLevel").asInt());
        assertEquals(6, p.path("profileIconId").asInt());
        JsonNode solo = p.path("ranks").get(0);
        assertEquals("RANKED_SOLO_5x5", solo.path("queue").asText());
        assertEquals("CHALLENGER", solo.path("tier").asText());
        assertEquals(1423, solo.path("lp").asInt());
        assertTrue(solo.path("hotStreak").asBoolean());
    }

    @Test
    void unknownRiotIdIs404() {
        RiotApiService.RiotException e = assertThrows(RiotApiService.RiotException.class, () -> riot.profile("kr", "없는사람", "KR1"));
        assertEquals(404, e.status);
    }

    @Test
    void badKeyBecomes503() {
        RiotApiService bad = new RiotApiService(new ObjectMapper(), "wrong", 18, 100, "http://127.0.0.1:" + server.getAddress().getPort() + "/{host}");
        assertEquals(503, assertThrows(RiotApiService.RiotException.class, () -> bad.rotation("kr")).status);
        RiotApiService none = new RiotApiService(new ObjectMapper(), "", 18, 100, "http://127.0.0.1:1/{host}");
        assertFalse(none.configured());
        assertEquals(503, assertThrows(RiotApiService.RiotException.class, () -> none.rotation("kr")).status);
    }

    @Test
    void matchesAreSlimmedAndKeepOrder() {
        JsonNode list = riot.matches("kr", ME, 0, 12, null);
        assertEquals(12, list.size());
        assertEquals("KR_7400000000", list.get(0).path("id").asText());
        JsonNode m = list.get(0);
        assertEquals(10, m.path("participants").size());
        assertEquals(2, m.path("teams").size());
        JsonNode me = null;
        for (JsonNode x : m.path("participants")) if (ME.equals(x.path("puuid").asText())) me = x;
        assertNotNull(me);
        assertEquals("Hide on bush", me.path("name").asText());
        assertEquals("KR1", me.path("tag").asText());
        assertFalse(me.path("championName").asText().isEmpty());
        assertTrue(me.path("championId").asInt() > 0);
        assertEquals(7, me.path("items").size());
        assertTrue(me.path("keystone").asInt() > 8000, "핵심 룬 id");
        assertTrue(me.path("subStyle").asInt() >= 8000, "보조 룬 계열 id");
        assertEquals(4, me.path("spell1").asInt());
        assertTrue(m.path("duration").asLong() > 0);
        assertTrue(m.path("start").asLong() > 1_700_000_000_000L);
        // 다시하기 경기
        assertTrue(list.get(5).path("participants").get(0).path("remake").asBoolean());
        // 팀 목표
        assertTrue(m.path("teams").get(0).path("tower").asInt() >= 1);
        assertEquals(5, m.path("teams").get(0).path("bans").size());
    }

    @Test
    void finishedMatchesAreCached() {
        riot.matches("kr", ME, 0, 3, 420);
        int before;
        synchronized (hits) { before = (int) hits.stream().filter(h -> h.contains("/matches/KR_")).count(); }
        riot.matches("kr", ME, 0, 3, 440); // 다른 큐 → ids 다시 받지만 상세는 캐시
        int after;
        synchronized (hits) { after = (int) hits.stream().filter(h -> h.contains("/matches/KR_")).count(); }
        assertEquals(before, after);
    }

    @Test
    void liveGameWithRanksAndNotInGame() {
        JsonNode g = riot.live("kr", ME);
        assertTrue(g.path("inGame").asBoolean());
        assertEquals(420, g.path("queueId").asInt());
        assertEquals(10, g.path("participants").size());
        JsonNode p0 = g.path("participants").get(0);
        assertEquals("Hide on bush#KR1", p0.path("riotId").asText());
        assertTrue(p0.path("perk0").asInt() > 8000);
        assertEquals("CHALLENGER", p0.path("solo").path("tier").asText(), "참가자 솔로 랭크");
        assertTrue(g.path("participants").get(3).path("solo").isMissingNode(), "언랭은 비움");
        assertEquals(10, g.path("bans").size());
        assertFalse(riot.live("kr", "someone-else").path("inGame").asBoolean());
    }

    @Test
    void masteryAndRanking() {
        JsonNode m = riot.mastery("kr", ME, 5);
        assertEquals(10, m.size());
        assertTrue(m.get(0).path("points").asLong() > 0);
        JsonNode r = riot.ladder("kr", "RANKED_SOLO_5x5", 0, 20);
        assertEquals(1000, r.path("total").asInt());
        assertEquals(20, r.path("entries").size());
        JsonNode first = r.path("entries").get(0), second = r.path("entries").get(1);
        assertEquals(1, first.path("rank").asInt());
        assertEquals("CHALLENGER", first.path("tier").asText());
        assertTrue(first.path("lp").asInt() >= second.path("lp").asInt());
        assertFalse(first.path("gameName").asText().isEmpty());
        JsonNode p2 = riot.ladder("kr", "RANKED_SOLO_5x5", 49, 20);
        assertEquals(981, p2.path("entries").get(0).path("rank").asInt());
        assertEquals("GRANDMASTER", p2.path("entries").get(0).path("tier").asText());
    }

    @Test
    void rotationPassesThrough() {
        assertEquals(20, riot.rotation("kr").path("freeChampionIds").size());
    }
}
