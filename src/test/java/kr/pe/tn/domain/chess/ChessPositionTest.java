package kr.pe.tn.domain.chess;

import kr.pe.tn.domain.chess.engine.ChessPosition;
import kr.pe.tn.domain.chess.entity.ChessRoom;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** 서버 체스 규칙 검증 (스프링 없이 실행) */
class ChessPositionTest {

    private static long perft(String fen, int depth) {
        return ChessPosition.fromFen(fen).perft(depth);
    }

    @Test
    void perftStartPosition() {
        long[] expected = {20, 400, 8902, 197281};
        for (int d = 1; d <= 4; d++) assertEquals(expected[d - 1], perft(ChessPosition.START_FEN, d));
    }

    @Test
    void perftKiwipete() {
        String fen = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";
        long[] expected = {48, 2039, 97862};
        for (int d = 1; d <= 3; d++) assertEquals(expected[d - 1], perft(fen, d));
    }

    @Test
    void perftEnPassantAndPromotion() {
        assertEquals(43238, perft("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", 4));
        assertEquals(9467, perft("r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", 3));
        assertEquals(62379, perft("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", 3));
    }

    @Test
    void roomRejectsIllegalAndDetectsMate() {
        ChessRoom room = new ChessRoom("t", "a", "WHITE");
        room.join("b");
        room.start("a");
        assertThrows(IllegalStateException.class, () -> room.move("b", "e7e5"));     // 상대 차례
        assertThrows(IllegalArgumentException.class, () -> room.move("a", "e2e5"));  // 규칙 위반
        assertThrows(IllegalArgumentException.class, () -> room.move("a", "e1e2"));  // 막힌 칸
        room.move("a", "f2f3");
        room.move("b", "e7e5");
        room.move("a", "g2g4");
        room.move("b", "d8h4");
        assertEquals("FINISHED", room.toState().getStatus());
        assertEquals("BLACK", room.toState().getWinner());
        assertEquals("checkmate", room.toState().getReason());
    }

    @Test
    void roomThreefoldRepetition() {
        ChessRoom room = new ChessRoom("t", "a", "WHITE");
        room.join("b");
        room.start("a");
        String[] moves = {"g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1", "f6g8"};
        for (int i = 0; i < moves.length; i++) room.move(i % 2 == 0 ? "a" : "b", moves[i]);
        assertEquals("threefold", room.toState().getReason());
        assertNull(room.toState().getWinner());
    }
}
