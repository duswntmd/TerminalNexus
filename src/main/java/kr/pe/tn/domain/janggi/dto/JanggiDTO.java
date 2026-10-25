package kr.pe.tn.domain.janggi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 실시간 온라인 장기 DTO
 */
public class JanggiDTO {

    /** 방 생성 요청 */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRoomRequest {
        private String title;
        private String side;      // "CHO" or "HAN"
        private String formation; // "N_E_N_E" 등
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
        private String cho;
        private String han;
        private String status; // WAITING, PLAYING, FINISHED
        private int playerCount;
    }

    /** 대국 전체 상태 (클라이언트는 상차림 + 기보로 판을 재구성) */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomState {
        private String roomId;
        private String title;
        private String host;
        private String cho;
        private String han;
        private String choFormation;
        private String hanFormation;
        private String status;
        private String turn;          // "CHO" or "HAN"
        private List<int[]> moves;    // [from, to], 한수쉼은 [-1, -1]
        private String winner;        // "CHO" / "HAN" / null
        private String reason;
        private boolean bikjang;
        private String inCheck;       // 장군 받은 진영 또는 null
        private double choScore;
        private double hanScore;
    }

    /** STOMP 클라이언트 → 서버 동작 */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Action {
        public enum Type { FORMATION, START, MOVE, PASS, RESIGN, CHAT, LEAVE, REMATCH }

        private Type type;
        private Integer from;
        private Integer to;
        private String formation;
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
