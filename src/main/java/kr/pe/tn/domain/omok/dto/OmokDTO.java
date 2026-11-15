package kr.pe.tn.domain.omok.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 실시간 온라인 오목 DTO
 * 오류와 종료 사유는 화면에서 번역하도록 코드(예: not_your_turn, forbidden_three3)로 보낸다.
 */
public class OmokDTO {

    /** 방 생성 요청 */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRoomRequest {
        private String title;
        private String side;         // "BLACK", "WHITE", "RANDOM"
        private String rule;         // "renju", "standard", "free"
        private Integer turnSeconds; // 한 수 제한 시간 (15, 30, 60)
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
        private String black;
        private String white;
        private String status; // WAITING, PLAYING, FINISHED
        private String rule;
        private int turnSeconds;
        private int playerCount;
    }

    /** 대국 전체 상태 (클라이언트는 수순으로 판을 재구성) */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomState {
        private String roomId;
        private String title;
        private String host;
        private String black;
        private String white;
        private String status;
        private String rule;
        private int turnSeconds;
        private int gameNo;            // 몇 번째 판인지 (재대국마다 증가)
        private List<Integer> moves;   // 칸 번호 (y * 15 + x), 흑부터
        private String turn;           // "BLACK" or "WHITE"
        private String winner;         // "BLACK" / "WHITE" / null(무승부 또는 진행 중)
        private String reason;         // five, full, resign, timeout, leave
        private List<Integer> winLine; // 승리한 줄의 칸 번호
        private String undoRequest;    // 무르기를 요청한 쪽 또는 null
        private List<String> rematch;  // 재대국을 누른 쪽
        private Long turnEndsAt;       // 이번 차례가 끝나는 시각 (epoch ms)
        private long serverTime;       // 상태를 만든 서버 시각 (시계 차이 보정용)
    }

    /** STOMP 클라이언트 → 서버 동작 */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Action {
        public enum Type { START, MOVE, RESIGN, UNDO_REQUEST, UNDO_ACCEPT, UNDO_DECLINE, REMATCH, CHAT, LEAVE }

        private Type type;
        private Integer cell;
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
