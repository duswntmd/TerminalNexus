package kr.pe.tn.domain.gostop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * 온라인 맞고 DTO. 오류와 종료 사유는 화면에서 번역하도록 코드로 보낸다.
 */
public class GostopDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRoomRequest {
        private String title;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomSummary {
        private String roomId;
        private String title;
        private String host;
        private List<String> players;
        private String status;
        private int playerCount;
    }

    /** 한 사람 시점의 방 상태. game은 engine.js 상태와 같은 모양(상대 손패·덱은 -1) */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomState {
        private String roomId;
        private String title;
        private String host;
        private List<String> players;
        private String status;
        private int seat;        // 내 자리 (0, 1), 대국자가 아니면 -1
        private long seq;        // 상태 번호 (새 이벤트 판단용)
        private int[] totals;    // 방 누적 점수
        private int carry;       // 다음 판 배수 (나가리)
        private Map<String, Object> game;
        private Map<String, Object> settlement;
    }

    /** STOMP 클라이언트 → 서버 */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Action {
        public enum Type { START, ACT, CHAT, LEAVE }

        private Type type;
        private String act;     // play, bomb, flip, choose, go, stop, gukjin
        private Integer card;
        private Boolean shake;
        private Integer month;
        private String value;   // 국진: null(자동), yeol, pi
        private String text;
    }

    /** 서버 → 클라이언트 */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Event {
        public enum Type { STATE, CHAT, CLOSED, ERROR }

        private Type type;
        private RoomState state;
        private String roomId;
        private String sender;
        private String text;
    }
}
