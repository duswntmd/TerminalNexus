package kr.pe.tn.domain.seotda;

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
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;

/** 서버 섯다 규칙 검증 (스프링 없이 실행). 2인 대결표는 프론트 엔진이 만든 기준 파일과 대조 */
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
        String table;
        try (InputStream in = getClass().getResourceAsStream("/seotda/pairs.txt")) {
            assertNotNull(in, "기준 파일 없음: node scripts/seotda-test.mjs --fixture 로 만든다");
            table = new String(in.readAllBytes(), StandardCharsets.UTF_8).strip();
        }
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
        assertEquals(table.length(), k);
        assertEquals(14535, k);
    }

    @Test
    void specialHands() {
        assertEquals(List.of(0), win("4A 7A", "1A 3A").winners());      // 암행어사가 13광땡을 잡음
        assertEquals(List.of(1), win("4A 7A", "3A 8A").winners());      // 38광땡은 못 잡음
        assertEquals(List.of(1), win("4A 7A", "10A 10B").winners());    // 광땡이 없으면 1끗
        assertEquals(List.of(0), win("3A 7A", "9A 9B").winners());      // 땡잡이가 9땡을 잡음
        assertEquals(List.of(1), win("3A 7A", "10A 10B").winners());    // 장땡은 못 잡음
        assertEquals(List.of(2), win("3A 7A", "5A 5B", "10A 10B").winners());
        assertTrue(win("4B 9B", "1B 2A").redo());                       // 구사 vs 알리
        assertFalse(win("4B 9B", "1A 1B").redo());                      // 구사 vs 삥땡
        assertTrue(win("4A 9A", "8A 8B").redo());                       // 멍텅구리구사 vs 8땡
        assertEquals(List.of(1), win("4A 9A", "10A 10B").winners());    // 멍텅구리구사 vs 장땡
        assertEquals(2, win("2A 3B", "6B 9A").winners().size());        // 5끗 동점
    }

    private static int[] deck(String... first) {
        List<Integer> d = new ArrayList<>();
        for (String s : first) d.add(c(s));
        IntStream.range(0, 20).filter(i -> !d.contains(i)).forEach(d::add);
        return d.stream().mapToInt(Integer::intValue).toArray();
    }

    @Test
    void bettingRoundAndRejectsForgedActions() {
        SeotdaHand h = new SeotdaHand(List.of(10000, 10000), 0, 100, 0, deck("10A", "1B", "10B", "2A"));
        assertEquals(200, h.getPot());
        assertEquals(List.of("die", "check", "bbing", "half"), h.legalActions(0).stream().map(SeotdaHand.Act::type).toList());
        assertThrows(IllegalArgumentException.class, () -> h.apply(1, "call"));   // 차례 아님
        assertThrows(IllegalArgumentException.class, () -> h.apply(0, "call"));   // 낼 돈 없음
        assertThrows(IllegalArgumentException.class, () -> h.apply(0, "allin"));  // 없는 행동
        h.apply(0, "half");
        assertEquals(200, h.getLevel());
        h.apply(1, "half");
        assertEquals(400, h.getLevel());
        assertThrows(IllegalArgumentException.class, () -> h.apply(0, "half"));   // 두 번 올리기
        h.apply(0, "call");
        assertTrue(h.isDone());
        assertEquals("showdown", h.getOutcome().type());
        assertEquals(800, h.getOutcome().payouts().get(0));
        assertEquals(10400, h.getPlayers().get(0).getChips());

        // 베팅 한도: 가장 적게 가진 사람 기준
        SeotdaHand capped = new SeotdaHand(List.of(10000, 150), 0, 100, 0, deck("10A", "1B", "10B", "2A"));
        capped.apply(0, "half");
        assertEquals(150, capped.getLevel());
        capped.apply(1, "call");
        assertEquals(0, capped.getPlayers().get(1).getChips());

        // 재경기: 판돈 이월
        SeotdaHand redo = new SeotdaHand(List.of(10000, 10000), 0, 100, 0, deck("4B", "1B", "9B", "2A"));
        redo.apply(0, "check");
        redo.apply(1, "check");
        assertEquals("redo", redo.getOutcome().type());
        assertEquals(200, redo.getOutcome().carry());

        // 3명 동점 분배 + 차례 밖 다이(나감)
        SeotdaHand three = new SeotdaHand(List.of(10000, 10000, 10000), 0, 110, 0, deck("2A", "6A", "1A", "3B", "9A", "4B"));
        three.forceFold(2);
        assertEquals(0, three.getTurn());
        three.apply(0, "check");
        three.apply(1, "check");
        assertEquals(List.of(0, 1), three.getOutcome().winners());
        assertEquals(165, three.getOutcome().payouts().get(0));
    }

    @Test
    void roomFlowHidesCardsAndChecksTurn() {
        SeotdaRoom room = new SeotdaRoom("t", "host");
        room.join("guest");
        assertThrows(IllegalStateException.class, () -> room.start("guest")); // 방장만
        room.start("host");
        var publicState = room.toState(null);
        assertNull(publicState.getMyCards());
        assertTrue(publicState.getSeats().stream().allMatch(s -> s.getCards() == null)); // 진행 중엔 패 비공개
        assertEquals(2, room.toState("guest").getMyCards().size());
        assertNull(room.toState("watcher").getMyCards());

        int turn = publicState.getTurn();
        String other = turn == 0 ? "guest" : "host";
        String mover = turn == 0 ? "host" : "guest";
        assertThrows(IllegalStateException.class, () -> room.bet(other, "check"));
        assertThrows(IllegalArgumentException.class, () -> room.bet(mover, "raise_1000000"));
        room.bet(mover, "die");
        var done = room.toState(null);
        assertEquals("FINISHED", done.getStatus());
        assertEquals("fold", done.getResult().getType());
        assertEquals(10000 + 100, done.getSeats().get(1 - turn).getChips());
        assertTrue(done.getSeats().stream().allMatch(s -> s.getCards() == null)); // 다이로 끝나면 공개 안 함

        // 다음 판은 이긴 사람이 선
        room.start("host");
        assertEquals(1 - turn, room.toState(null).getDealer());
        // 판 도중 손님이 나가면 다이 처리 후 자리 정리
        assertFalse(room.leave("guest"));
        assertEquals("WAITING", room.getStatus().name()); // 자리 번호가 바뀌어 지난 결과는 지움
        assertEquals(1, room.getSeats().size());
    }
}
