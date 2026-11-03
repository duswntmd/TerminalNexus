package kr.pe.tn.domain.chess.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 실시간 온라인 체스 DTO
 * 오류와 종료 사유는 화면에서 번역하도록 코드(예: not_your_turn, checkmate)로 보낸다.
 */
public class ChessDTO {

    /** 방 생성 요청 */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRoomRequest {
        private String title;
        private String side; // "WHITE", "BLACK", "RANDOM"
    }

    /** 로비 목록용 요약 */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomSummary {
        private String roomId;
        private String title;
        private String host;
        private String white;
        private String black;
        private String status; // WAITING, PLAYING, FINISHED
        private int playerCount;
    }

    /** 대국 전체 상태 (클라이언트는 시작 국면 + 기보로 판을 재구성) */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomState {
        private String roomId;
        private String title;
        private String host;
        private String white;
        private String black;
        private String status;
        private String startFen;
        private List<String> moves;  // UCI 표기 (e2e4, e7e8q)
        private String turn;         // "WHITE" or "BLACK"
        private boolean inCheck;
        private String winner;       // "WHITE" / "BLACK" / null(무승부 또는 진행 중)
        private String reason;       // checkmate, stalemate, threefold, fifty, insufficient, resign, leave, agreement
        private String drawOffer;    // 무승부를 제안한 쪽 또는 null
    }

    /** STOMP 클라이언트 → 서버 동작 */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Action {
        public enum Type { START, MOVE, RESIGN, DRAW_OFFER, DRAW_ACCEPT, DRAW_DECLINE, CHAT, LEAVE, REMATCH }

        private Type type;
        private String move; // UCI
        private String text;
    }

    /** 서버 → 클라이언트 브로드캐스트 */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Event {
        public enum Type { STATE, CHAT, CLOSED, ERROR }

        private Type type;
        private RoomState state;
        private String sender;
        private String text;
    }
}
