package kr.pe.tn.domain.omok;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.pe.tn.domain.omok.dto.OmokDTO;
import kr.pe.tn.domain.omok.engine.OmokRules;
import kr.pe.tn.domain.omok.entity.OmokRoom;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;

import static kr.pe.tn.domain.omok.engine.OmokRules.BLACK;
import static kr.pe.tn.domain.omok.engine.OmokRules.CELLS;
import static kr.pe.tn.domain.omok.engine.OmokRules.EMPTY;
import static kr.pe.tn.domain.omok.engine.OmokRules.SIZE;
import static kr.pe.tn.domain.omok.engine.OmokRules.WHITE;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 서버 오목 규칙 검증 (스프링 없이 실행). 규칙 문서: frontend/src/pages/play/omok/RULES.md
 * 그림: X 흑, O 백, * 시험할 빈칸. 왼쪽 위 (0,0)부터.
 */
class OmokRulesTest {

    private record Pos(int[] board, int target) {
    }

    private static Pos pos(String... rows) {
        int[] board = new int[CELLS];
        int target = -1;
        for (int y = 0; y < rows.length; y++) {
            for (int x = 0; x < rows[y].length(); x++) {
                char ch = rows[y].charAt(x);
                if (ch == 'X') board[y * SIZE + x] = BLACK;
                else if (ch == 'O') board[y * SIZE + x] = WHITE;
                else if (ch == '*') target = y * SIZE + x;
            }
        }
        return new Pos(board, target);
    }

    private static String why(String rule, int color, String... rows) {
        Pos p = pos(rows);
        int[] board = p.board();
        if (color == WHITE) for (int i = 0; i < CELLS; i++) board[i] = board[i] == 0 ? 0 : 3 - board[i]; // 색을 뒤집어 백 기준으로
        return OmokRules.forbiddenReason(board, p.target(), color, rule);
    }

    private static int at(int x, int y) {
        return y * SIZE + x;
    }

    @Test
    void threeThree() {
        String[] cross = {"", "", "", "", ".....X", "....X*X", ".....X"};
        assertEquals("three3", why("renju", BLACK, cross));
        assertNull(why("renju", WHITE, cross));
        assertEquals("three3", why("standard", BLACK, cross));
        assertEquals("three3", why("standard", WHITE, cross));
        assertNull(why("free", BLACK, cross));
        assertEquals("three3", why("renju", BLACK, "", "", "", "", ".....X", "...X.*X", ".....X")); // 띈 3
    }

    @Test
    void notAThreeWhenStraightFourIsImpossible() {
        assertNull(why("renju", BLACK, "", "", "", "", "...X", "OXX*", "...X"));          // 한쪽이 막힘
        assertNull(why("renju", BLACK, "", "", "", "", "..X", "XX*", "..X"));            // 판 끝
        assertNull(why("renju", BLACK, "", "", "", "", "....X", "O.XX*.O", "....X"));    // 양쪽이 좁음
        assertEquals("three3", why("renju", BLACK, "", "", "", "", "....X", "O.XX*..", "....X"));
        assertNull(why("renju", BLACK, "", "", "", "", ".....X", "X..XX*..X", ".....X")); // 장목에 걸림
        assertEquals("three3", why("renju", BLACK, "", "", "", "", ".....X", "X..XX*...", ".....X"));
    }

    @Test
    void foursAndOverline() {
        assertNull(why("renju", BLACK, "", "", "", "", ".....X", "..XXX*", ".....X")); // 4-3
        String[] ff = {"", "", ".....X", ".....X", ".....X", "..XXX*"};
        assertEquals("four4", why("renju", BLACK, ff));
        assertNull(why("renju", WHITE, ff));
        assertNull(why("standard", BLACK, ff));
        assertEquals("four4", why("renju", BLACK, "", "X.X*X.X"));
        assertEquals("four4", why("renju", BLACK, "", "XX.*X.XX"));
        assertEquals("four4", why("renju", BLACK, "", "XXX.*.XXX"));
        assertNull(why("renju", BLACK, "", ".XX*X."));                                  // 열린 4 하나
        assertEquals("three3", why("renju", BLACK, "", "", "...X.X.X", "....XXX", "..XXX*")); // 4-3-3
        assertEquals("overline", why("renju", BLACK, "", "XXX*XX"));
        assertNull(why("renju", WHITE, "", "XXX*XX"));
        assertNull(why("standard", BLACK, "", "XXX*XX"));
        assertNull(why("renju", BLACK, "", "XXX*XX", "...X", "...X", "...X", "...X")); // 5목이 우선
    }

    @Test
    void falseForbiddenPoints() {
        String[] rows = {"", "", "", ".....X", ".....X", ".....X", "O.XX*..", "....X", "....X"};
        assertNull(why("renju", BLACK, rows));               // 열린 4 자리가 4-4 금수 → 가로는 3이 아님
        assertEquals("three3", why("standard", BLACK, rows)); // 일반룰에는 4-4 금수가 없음
        String[] real = rows.clone();
        real[3] = "";
        assertEquals("three3", why("renju", BLACK, real));
        // 열린 4 자리가 4-3-3 금수
        assertNull(why("renju", BLACK, "", "", "", "", ".....X", ".....X", "O.XX*..", "....X.X", "....X..X"));
    }

    @Test
    void winLines() {
        Pos over = pos("", "OOO*OO");
        int[] b = over.board();
        b[over.target()] = WHITE;
        assertEquals(6, OmokRules.winLine(b, over.target(), WHITE, "renju").size());
        assertNull(OmokRules.winLine(b, over.target(), WHITE, "standard"));
        assertEquals(6, OmokRules.winLine(b, over.target(), WHITE, "free").size());
        Pos five = pos("....X", "...X", "..*", ".X", "X");
        five.board()[five.target()] = BLACK;
        assertEquals(List.of(at(0, 4), at(1, 3), at(2, 2), at(3, 1), at(4, 0)), OmokRules.winLine(five.board(), five.target(), BLACK, "renju"));
    }

    private static String forbiddenList(int[] board, int color, String rule) {
        StringJoiner sj = new StringJoiner(",");
        for (int idx = 0; idx < CELLS; idx++) {
            if (board[idx] != EMPTY) continue;
            String r = OmokRules.forbiddenReason(board, idx, color, rule);
            if (r != null) sj.add(idx + ":" + r);
        }
        return sj.toString();
    }

    /** 프론트 엔진이 무작위로 둔 대국을 그대로 따라 두며 수마다의 금수 자리와 결과가 같은지 (방 로직으로 진행) */
    @Test
    void replaysFrontendGames() throws IOException {
        JsonNode games;
        try (InputStream in = getClass().getResourceAsStream("/omok/games.json")) {
            games = new ObjectMapper().readTree(in);
        }
        assertEquals(90, games.size());
        int forbiddenSeen = 0;
        int g = 0;
        for (JsonNode game : games) {
            String label = "판 " + g++;
            String rule = game.get("rule").asText();
            OmokRoom room = new OmokRoom("t", "A", "BLACK", rule, 30);
            room.join("B");
            room.start("A");
            JsonNode moves = game.get("moves");
            JsonNode rejected = game.get("rejected");
            int rj = 0;
            for (int i = 0; i < moves.size(); i++) {
                int color = i % 2 == 0 ? BLACK : WHITE;
                String nick = color == BLACK ? "A" : "B";
                String expected = game.get("forbidden").get(i).asText();
                assertEquals(expected, forbiddenList(room.getBoard(), color, rule), label + " " + i + "수 금수 자리");
                if (!expected.isEmpty()) forbiddenSeen++;
                while (rj < rejected.size() && rejected.get(rj).get(0).asInt() == i) {
                    int cell = rejected.get(rj).get(1).asInt();
                    String code = "forbidden_" + rejected.get(rj).get(2).asText();
                    IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> room.move(nick, cell), label);
                    assertEquals(code, e.getMessage(), label);
                    rj++;
                }
                assertEquals(OmokRoom.Status.PLAYING, room.getStatus(), label + " " + i + "수 전에는 진행 중");
                room.move(nick, moves.get(i).asInt());
            }
            assertEquals(OmokRoom.Status.FINISHED, room.getStatus(), label);
            assertEquals(game.get("winner").isNull() ? null : game.get("winner").asText(), room.getWinner(), label);
            assertEquals(game.get("reason").asText(), room.getReason(), label);
            List<Integer> line = new ArrayList<>();
            game.get("winLine").forEach(x -> line.add(x.asInt()));
            assertEquals(line, room.getWinLine() == null ? List.of() : room.getWinLine(), label);
        }
        assertTrue(forbiddenSeen > 100, "금수 자리가 있는 국면이 충분히 나와야 함: " + forbiddenSeen);
    }

    private static OmokRoom started(String rule) {
        OmokRoom room = new OmokRoom("방", "A", "BLACK", rule, 30);
        assertThrows(IllegalStateException.class, () -> room.start("A")); // 상대 없음
        room.join("B");
        assertThrows(IllegalStateException.class, () -> room.start("B")); // 방장만
        room.start("A");
        return room;
    }

    @Test
    void roomTurnsAndValidation() {
        OmokRoom room = started("renju");
        assertEquals("not_your_turn", assertThrows(IllegalStateException.class, () -> room.move("B", at(7, 7))).getMessage());
        assertEquals("not_player", assertThrows(IllegalStateException.class, () -> room.move("C", at(7, 7))).getMessage());
        room.move("A", at(7, 7));
        assertEquals("occupied", assertThrows(IllegalArgumentException.class, () -> room.move("B", at(7, 7))).getMessage());
        assertEquals("occupied", assertThrows(IllegalArgumentException.class, () -> room.move("B", 225)).getMessage());
        assertEquals("occupied", assertThrows(IllegalArgumentException.class, () -> room.move("B", null)).getMessage());
        room.move("B", at(0, 0));
        // 흑 십자 모양을 만든 뒤 가운데(3-3)는 거부
        room.move("A", at(9, 7));
        room.move("B", at(0, 2));
        room.move("A", at(8, 6));
        room.move("B", at(0, 4));
        room.move("A", at(8, 8));
        room.move("B", at(0, 6));
        assertEquals("forbidden_three3", assertThrows(IllegalArgumentException.class, () -> room.move("A", at(8, 7))).getMessage());
        assertEquals(8, room.getMoves().size());
        OmokDTO.RoomState st = room.toState();
        assertEquals("BLACK", st.getTurn());
        assertNotNull(st.getTurnEndsAt());
    }

    @Test
    void roomWinResignTimeoutRematch() {
        OmokRoom room = started("renju");
        for (int i = 0; i < 4; i++) {
            room.move("A", at(3 + i, 7));
            room.move("B", at(3 + i, 9));
        }
        room.move("A", at(7, 7));
        assertEquals(OmokRoom.Status.FINISHED, room.getStatus());
        assertEquals("BLACK", room.getWinner());
        assertEquals("five", room.getReason());
        assertEquals(5, room.getWinLine().size());
        assertThrows(IllegalStateException.class, () -> room.move("B", at(0, 0)));

        // 재대국: 두 사람이 모두 눌러야 시작, 흑백 교체
        room.rematch("A");
        assertEquals(OmokRoom.Status.FINISHED, room.getStatus());
        assertEquals(List.of("BLACK"), room.toState().getRematch());
        room.rematch("B");
        assertEquals(OmokRoom.Status.PLAYING, room.getStatus());
        assertEquals("B", room.getBlack());
        assertEquals("A", room.getWhite());
        assertEquals(2, room.getGameNo());
        assertTrue(room.getMoves().isEmpty());

        // 시간패: 제한 시간 전에는 그대로, 지나면 차례인 쪽(흑 B)이 짐
        assertFalse(room.expireTurn(System.currentTimeMillis()));
        assertTrue(room.expireTurn(System.currentTimeMillis() + 31_000));
        assertEquals("WHITE", room.getWinner());
        assertEquals("timeout", room.getReason());

        // 기권
        room.rematch("A");
        room.rematch("B");
        room.resign("B"); // 이번 판에서 B 는 백
        assertEquals("BLACK", room.getWinner());
        assertEquals("resign", room.getReason());

        // 대국자가 나가면 대기 상태로, 방장이 나가면 방을 닫음
        assertFalse(room.leave("B"));
        assertEquals(OmokRoom.Status.WAITING, room.getStatus());
        assertTrue(room.leave("A"));
    }

    @Test
    void roomUndo() {
        OmokRoom room = started("free");
        assertEquals("nothing_to_undo", assertThrows(IllegalStateException.class, () -> room.requestUndo("A")).getMessage());
        room.move("A", at(7, 7));
        room.move("B", at(8, 8));
        room.move("A", at(7, 8));
        // 방금 둔 흑이 요청 → 백이 수락 → 흑의 마지막 수만 되돌리고 흑 차례
        room.requestUndo("A");
        assertEquals("BLACK", room.toState().getUndoRequest());
        assertEquals("undo_pending", assertThrows(IllegalStateException.class, () -> room.requestUndo("B")).getMessage());
        assertEquals("no_undo_request", assertThrows(IllegalStateException.class, () -> room.answerUndo("A", true)).getMessage());
        room.answerUndo("B", true);
        assertEquals(List.of(at(7, 7), at(8, 8)), room.getMoves());
        assertEquals(BLACK, room.getTurn());
        assertEquals(EMPTY, room.getBoard()[at(7, 8)]);
        // 내 차례에 요청하면 두 수(상대 수 + 내 수)를 되돌림
        room.requestUndo("A");
        room.answerUndo("B", true);
        assertEquals(List.of(), room.getMoves());
        assertEquals(BLACK, room.getTurn());
        // 거절하면 그대로, 상대가 그냥 두면 요청이 사라짐
        room.move("A", at(7, 7));
        room.requestUndo("A");
        room.answerUndo("B", false);
        assertEquals(1, room.getMoves().size());
        room.requestUndo("A");
        room.move("B", at(8, 8));
        assertNull(room.toState().getUndoRequest());
        // 대국 중 퇴장은 상대 승리
        assertFalse(room.leave("B"));
        assertEquals(OmokRoom.Status.WAITING, room.getStatus());
    }
}
