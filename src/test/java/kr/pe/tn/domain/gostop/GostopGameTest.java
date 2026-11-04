package kr.pe.tn.domain.gostop;

import kr.pe.tn.domain.gostop.engine.GostopGame;
import kr.pe.tn.domain.gostop.engine.GostopGame.Action;
import kr.pe.tn.domain.gostop.entity.GostopRoom;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/** 서버 맞고 규칙 검증 (스프링 없이 실행). 프론트 engine.test.mjs 와 같은 상황을 확인한다 */
class GostopGameTest {

    private static List<Map<String, Object>> events(GostopGame g) {
        return g.getEvents();
    }

    private static boolean has(GostopGame g, String type) {
        return events(g).stream().anyMatch(e -> type.equals(e.get("type")));
    }

    @Test
    void scoring() {
        assertEquals(3, GostopGame.scoreOf(List.of(0, 8, 28), null).gwang());
        assertEquals(2, GostopGame.scoreOf(List.of(0, 8, 44), null).gwang());
        assertEquals(15, GostopGame.scoreOf(List.of(0, 8, 28, 40, 44), null).gwang());
        assertEquals(3, GostopGame.scoreOf(List.of(1, 5, 9), null).total());
        assertEquals(1, GostopGame.scoreOf(List.of(1, 5, 13, 21, 46), null).total());
        assertEquals(5, GostopGame.scoreOf(List.of(4, 12, 29), null).total());
        assertEquals(1, GostopGame.scoreOf(List.of(2, 3, 6, 7, 10, 11, 14, 15, 18, 19), null).total());
        assertEquals(10, GostopGame.scoreOf(List.of(41, 47, 2, 3, 6, 7, 10, 11), null).piCount());
        List<Integer> gk = List.of(32, 2, 3, 6, 7, 10, 11, 14, 15);
        assertEquals(0, GostopGame.scoreOf(gk, "yeol").total());
        assertEquals(1, GostopGame.scoreOf(gk, null).total());
    }

    @Test
    void ppeokAndJjok() {
        GostopGame g = GostopGame.custom(List.of(3, 40), List.of(44), List.of(2), List.of(45, 0));
        g.apply(Action.play(3));
        assertTrue(has(g, "ppeok"));
        assertEquals(0, g.capturedOf(0).size());

        g = GostopGame.custom(List.of(2, 40), List.of(44), List.of(6), List.of(45, 3));
        g.apply(Action.play(2));
        assertTrue(has(g, "jjok"));
        assertTrue(g.capturedOf(0).containsAll(List.of(2, 3)));
    }

    @Test
    void ttadakNeedsChoice() {
        GostopGame g = GostopGame.custom(List.of(3, 40), List.of(44), List.of(1, 2, 6), List.of(45, 0));
        g.apply(Action.play(3));
        assertEquals("choose", g.getPhase());
        g.apply(new Action("choose", 1, null, null, null));
        assertTrue(has(g, "ttadak"));
        assertTrue(g.capturedOf(0).containsAll(List.of(0, 1, 2, 3)));
    }

    @Test
    void rejectsIllegal() {
        GostopGame g = GostopGame.custom(List.of(3), List.of(44), List.of(2), List.of(45));
        assertThrows(IllegalArgumentException.class, () -> g.apply(Action.play(44)));
        assertThrows(IllegalArgumentException.class, () -> g.apply(new Action("bomb", null, null, 1, null)));
    }

    @Test
    void randomGamesKeep48Cards() {
        Random rnd = new Random(7);
        for (int n = 0; n < 500; n++) {
            GostopGame g = GostopGame.newGame(n % 2, 1);
            int guard = 0;
            while (!g.isEnded()) {
                List<Action> acts = g.legalActions();
                g.apply(acts.get(rnd.nextInt(acts.size())));
                List<Integer> all = g.allCards();
                assertEquals(48, all.size());
                assertEquals(48, new HashSet<>(all).size());
                assertTrue(++guard < 200);
            }
            Map<String, Object> s = g.settle();
            assertNotNull(s);
            if (s.get("winner") != null && !"leave".equals(s.get("reason"))) assertTrue((Integer) s.get("final") > 0);
        }
    }

    @Test
    void viewHidesOpponentHandAndDeck() {
        GostopGame g = GostopGame.newGame(0, 1);
        Map<String, Object> v = g.viewFor(0);
        @SuppressWarnings("unchecked")
        List<List<Integer>> hands = (List<List<Integer>>) v.get("hands");
        assertTrue(hands.get(1).stream().allMatch(c -> c == -1));
        assertTrue(hands.get(0).stream().noneMatch(c -> c == -1));
        @SuppressWarnings("unchecked")
        List<Integer> deck = (List<Integer>) v.get("deck");
        assertTrue(deck.stream().allMatch(c -> c == -1));
    }

    @Test
    void roomTurnsAndLeave() {
        GostopRoom room = new GostopRoom("t", "a");
        assertThrows(IllegalStateException.class, () -> room.start("a"));
        room.join("b");
        assertThrows(IllegalStateException.class, () -> room.join("c"));
        room.start("a");
        if (room.getStatus() == GostopRoom.Status.PLAYING) {
            String wrong = room.getGame().getTurn() == 0 ? "b" : "a";
            assertThrows(IllegalStateException.class, () -> room.act(wrong, Action.play(0)));
            room.leave("b");
            assertEquals(GostopRoom.Status.WAITING, room.getStatus());
        }
    }
}
