package kr.pe.tn.domain.seotda;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.pe.tn.domain.seotda.engine.SeotdaHand;
import kr.pe.tn.domain.seotda.engine.SeotdaRules;
import kr.pe.tn.domain.seotda.entity.SeotdaRoom;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 서버 섯다 규칙 검증 (스프링 없이 실행). 규칙: frontend/src/pages/play/seotda/RULES.md
 * 기준 파일은 프론트 엔진이 만든다: node scripts/seotda-test.mjs --fixture ../src/test/resources/seotda
 */
class SeotdaRulesTest {

    /** "4A" = 4월 첫 장(광·열끗), "4B" = 4월 둘째 장 */
    private static int c(String s) {
        int m = Integer.parseInt(s.substring(0, s.length() - 1));
        return (m - 1) * 2 + (s.endsWith("A") ? 0 : 1);
    }

    private static SeotdaRules.Result win(String... hands) {
        List<Integer> seats = new ArrayList<>();
        List<int[]> cards = new ArrayList<>();
        for (int i = 0; i < hands.length; i++) {
            String[] p = hands[i].split(" ");
            seats.add(i);
            cards.add(new int[]{c(p[0]), c(p[1])});
        }
        return SeotdaRules.resolve(seats, cards);
    }

    private static List<int[]> allHands() {
        List<int[]> all = new ArrayList<>();
        for (int a = 0; a < 20; a++) for (int b = a + 1; b < 20; b++) all.add(new int[]{a, b});
        return all;
    }

    private static String resource(String name) throws IOException {
        try (InputStream in = SeotdaRulesTest.class.getResourceAsStream("/seotda/" + name)) {
            assertNotNull(in, "기준 파일 없음: node scripts/seotda-test.mjs --fixture 로 만든다");
            return new String(in.readAllBytes(), StandardCharsets.UTF_8).strip();
        }
    }

    @Test
    void classifiesAll190Hands() {
        Map<String, Integer> counts = new HashMap<>();
        for (int[] h : allHands()) {
            SeotdaRules.Hand hand = SeotdaRules.classify(h[0], h[1]);
            counts.merge(hand.special() != null ? hand.special() : hand.code(), 1, Integer::sum);
            assertEquals(hand, SeotdaRules.classify(h[1], h[0]));
        }
        assertEquals(190, allHands().size());
        assertEquals(1, counts.get("gwang38"));
        assertEquals(10, counts.get("ttaeng"));
        assertEquals(4, counts.get("ali"));
        assertEquals(4, counts.get("seryuk"));
        assertEquals(1, counts.get("amhaeng"));
        assertEquals(1, counts.get("ttaengjabi"));
        assertEquals(3, counts.get("gusa"));
        assertEquals(1, counts.get("mgusa"));
        assertEquals(147, counts.get("kkut"));
    }

    @Test
    void matchesFrontendPairTable() throws IOException {
        String table = resource("pairs.txt");
        List<int[]> all = allHands();
        int k = 0;
        for (int i = 0; i < all.size(); i++) {
            for (int j = i + 1; j < all.size(); j++) {
                int[] x = all.get(i);
                int[] y = all.get(j);
                if (x[0] == y[0] || x[0] == y[1] || x[1] == y[0] || x[1] == y[1]) continue;
                SeotdaRules.Result r = SeotdaRules.resolve(List.of(0, 1), List.of(x, y));
                char got = r.redo() ? 'R' : r.winners().size() == 2 ? 'T' : r.winners().get(0) == 0 ? 'A' : 'B';
                assertEquals(table.charAt(k), got, "패 " + x[0] + "," + x[1] + " vs " + y[0] + "," + y[1]);
                k++;
            }
        }
        assertEquals(14535, k);
    }

    @Test
    void specialHands() {
        assertEquals(List.of(0), win("4A 7A", "1A 3A").winners());      // 암행어사 > 13광땡
        assertEquals(List.of(1), win("4A 7A", "3A 8A").winners());      // 38광땡은 못 잡음
        assertEquals(List.of(1), win("4A 7A", "10A 10B").winners());    // 광땡 없으면 1끗
        assertEquals(List.of(0), win("3A 7A", "9A 9B").winners());      // 땡잡이 > 9땡
        assertEquals(List.of(1), win("3A 7A", "10A 10B").winners());    // 장땡은 못 잡음
        assertEquals(List.of(2), win("3A 7A", "5A 5B", "10A 10B").winners());
        assertTrue(win("4B 9B", "1B 2A").redo());                       // 구사 vs 알리
        assertFalse(win("4B 9B", "1A 1B").redo());                      // 구사 vs 삥땡
        assertTrue(win("4A 9A", "8A 8B").redo());                       // 멍텅구리구사 vs 8땡
        assertEquals(List.of(1), win("4A 9A", "10A 10B").winners());    // 멍텅구리구사 vs 장땡
        assertEquals(2, win("2A 3B", "6B 9A").winners().size());        // 5끗 동점
    }

    /** 프론트 엔진이 무작위로 진행한 300판을 그대로 따라 해 매 순간의 행동 목록과 결과가 같은지 */
    @Test
    void replaysFrontendGames() throws IOException {
        JsonNode games = new ObjectMapper().readTree(resource("games.json"));
        assertEquals(300, games.size());
        int g = 0;
        for (JsonNode game : games) {
            String label = "판 " + g++;
            List<Integer> chips = new ArrayList<>();
            game.get("chips").forEach(x -> chips.add(x.asInt()));
            int[] deck = new int[20];
            for (int i = 0; i < 20; i++) deck[i] = game.get("deck").get(i).asInt();
            List<Integer> parts = null;
            int carry = 0;
            if (!game.get("redo").isNull()) {
                parts = new ArrayList<>();
                for (JsonNode x : game.get("redo").get("participants")) parts.add(x.asInt());
                carry = game.get("redo").get("carry").asInt();
            }
            SeotdaHand h = new SeotdaHand(chips, game.get("dealer").asInt(), 100, game.get("mode").asText(), parts, carry, deck);
            for (JsonNode step : game.get("steps")) {
                int seat = step.get("seat").asInt();
                String type = step.get("type").asText();
                switch (type) {
                    case "open" -> h.open(seat, step.get("card").asInt());
                    case "select" -> h.select(seat, List.of(step.get("pick").get(0).asInt(), step.get("pick").get(1).asInt()));
                    default -> {
                        String legal = h.legalActions(seat).stream().map(a -> a.type() + ":" + a.pay()).collect(Collectors.joining(","));
                        assertEquals(step.get("legal").asText(), legal, label + " 행동 목록");
                        h.bet(seat, type);
                    }
                }
            }
            JsonNode exp = game.get("expect");
            assertTrue(h.isDone(), label);
            SeotdaHand.Outcome out = h.getOutcome();
            assertEquals(exp.get("type").asText(), out.type(), label);
            assertEquals(exp.get("reason").asText(), out.reason(), label);
            assertEquals(exp.get("winners").toString(), out.winners().toString().replace(" ", ""), label);
            assertEquals(exp.get("participants").toString(), out.participants().toString().replace(" ", ""), label);
            assertEquals(exp.get("pot").asInt(), h.getPot(), label);
            assertEquals(exp.get("nextDealer").asInt(), out.nextDealer(), label);
            assertEquals(exp.get("carry").asInt(), out.carry(), label);
            for (int i = 0; i < chips.size(); i++) assertEquals(exp.get("chips").get(i).asInt(), h.getPlayers().get(i).getChips(), label);
        }
    }

    private static int[] deck(String... first) {
        List<Integer> d = new ArrayList<>();
        for (String s : first) d.add(c(s));
        IntStream.range(0, 20).filter(i -> !d.contains(i)).forEach(d::add);
        return d.stream().mapToInt(Integer::intValue).toArray();
    }

    @Test
    void rejectsForgedActions() {
        SeotdaHand h = new SeotdaHand(List.of(10000, 10000), 0, 100, "two", null, 0, deck("10A", "1B", "10B", "2A"));
        assertThrows(IllegalArgumentException.class, () -> h.bet(1, "check"));    // 차례 아님
        assertThrows(IllegalArgumentException.class, () -> h.bet(0, "call"));     // 낼 돈 없음
        assertThrows(IllegalArgumentException.class, () -> h.bet(0, "allin"));    // 없는 행동
        assertThrows(IllegalArgumentException.class, () -> h.bet(0, "ddadang"));  // 건 돈이 없으면 따당 불가
        assertThrows(IllegalArgumentException.class, () -> h.open(0, 0));         // 2장 섯다엔 공개 단계 없음

        SeotdaHand t = new SeotdaHand(List.of(10000, 10000), 0, 100, "three", null, 0, deck("3A", "5B", "7B", "6A", "8A", "6B"));
        assertThrows(IllegalArgumentException.class, () -> t.bet(0, "check"));    // 공개 단계엔 베팅 없음
        assertThrows(IllegalArgumentException.class, () -> t.open(0, 2));
        t.open(0, 1);
        assertThrows(IllegalArgumentException.class, () -> t.open(0, 0));         // 두 번 고르기
        t.open(1, 0);
        t.bet(0, "check");
        t.bet(1, "check");
        t.bet(0, "check");
        t.bet(1, "check");
        assertEquals("select", t.getPhase());
        assertThrows(IllegalArgumentException.class, () -> t.select(0, List.of(1, 1)));
        assertThrows(IllegalArgumentException.class, () -> t.select(0, List.of(0, 3)));
        t.select(0, List.of(0, 2));
        t.select(1, List.of(1, 2));
        assertEquals(List.of(0), t.getOutcome().winners()); // 38광땡 > 6땡
    }

    @Test
    void roomFlowHidesCardsAndReplays() {
        SeotdaRoom room = new SeotdaRoom("t", "host", "three");
        room.join("guest");
        assertThrows(IllegalStateException.class, () -> room.start("guest")); // 방장만
        room.start("host");
        var pub = room.toState(null);
        assertEquals("open", pub.getPhase());
        assertNull(pub.getMyCards());
        assertTrue(pub.getSeats().stream().allMatch(s -> s.getCards() == null && s.getOpenCard() == null)); // 진행 중엔 패 비공개
        assertEquals(2, room.toState("guest").getMyCards().size());
        assertNull(room.toState("watcher").getMyCards());

        room.open("host", 0);
        var afterOpen = room.toState(null);
        int hostSeat = room.seatOf("host");
        assertEquals(room.cardsOf("host").get(0), afterOpen.getSeats().get(hostSeat).getOpenCard()); // 고른 1장만 공개
        assertNull(afterOpen.getSeats().get(1 - hostSeat).getOpenCard());
        room.open("guest", 1);
        var bet = room.toState(null);
        assertEquals("bet", bet.getPhase());
        String mover = room.getSeats().get(bet.getTurn()).getNick();
        String other = mover.equals("host") ? "guest" : "host";
        assertThrows(IllegalStateException.class, () -> room.bet(other, "check"));
        assertThrows(IllegalArgumentException.class, () -> room.bet(mover, "raise_1000000"));
        room.bet(mover, "die");
        var done = room.toState(null);
        assertEquals("FINISHED", done.getStatus());
        assertEquals("fold", done.getResult().getType());
        assertEquals(10000 + 100, done.getSeats().get(room.seatOf(other)).getChips());
        assertTrue(done.getSeats().stream().allMatch(s -> s.getCards() == null)); // 다이로 끝나면 공개 안 함

        // 다음 판은 이긴 사람이 선. 판 도중 손님이 나가면 다이 처리 후 자리 정리
        room.start("host");
        assertEquals(room.seatOf(other), room.toState(null).getDealer());
        assertFalse(room.leave("guest"));
        assertEquals(1, room.getSeats().size());
    }

    @Test
    void timeoutAutoChoosesAndFolds() {
        SeotdaRoom room = new SeotdaRoom("t", "host", "three");
        room.join("guest");
        room.start("host");
        long later = System.currentTimeMillis() + SeotdaRoom.TURN_LIMIT_MS + 1;
        assertTrue(room.expireTurn(later)); // 공개 단계: 모두 첫 장 자동 공개
        assertEquals("bet", room.toState(null).getPhase());
        assertTrue(room.expireTurn(System.currentTimeMillis() + SeotdaRoom.TURN_LIMIT_MS + 1)); // 베팅: 다이
        assertEquals("FINISHED", room.getStatus().name());
    }
}
