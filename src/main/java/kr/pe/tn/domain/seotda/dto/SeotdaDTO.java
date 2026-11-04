package kr.pe.tn.domain.seotda.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * 실시간 온라인 섯다 DTO
 * 오류와 결과는 화면에서 번역하도록 코드(예: not_your_turn, showdown)로 보낸다.
 * 다른 사람의 패는 승부에서 공개될 때만 cards 에 넣고, 내 패는 myCards(REST) 또는 HAND 이벤트(개인 큐)로만 보낸다.
 */
public class SeotdaDTO {

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
        private String status; // WAITING, PLAYING, FINISHED
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatState {
        private String nick;
        private int chips;
        private int contrib;
        private boolean inHand;   // 이번 판에 패를 받았는지
        private boolean folded;
        private boolean raised;
        private String last;      // 마지막 행동 (die, check, call, bbing, half)
        private List<Integer> cards; // 공개된 패만
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LogEntry {
        private int seat;
        private String type;
        private int pay;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Result {
        private String type; // fold, showdown, redo
        private List<Integer> winners;
        private Map<Integer, Integer> payouts;
        private List<Integer> reveal;
        private Integer redoSeat;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomState {
        private String roomId;
        private String title;
        private String host;
        private String status;
        private int handNo;
        private int ante;
        private int cap;
        private int level;
        private int pot;
        private int carry;
        private int dealer;
        private int turn;          // 차례인 자리 번호, 없으면 -1
        private long turnEndsAt;   // 차례 제한 시각 (epoch ms), 없으면 0
        private List<SeatState> seats;
        private List<LogEntry> log;
        private Result result;
        private List<Integer> myCards; // 요청한 사람의 패 (REST 응답에만)
    }

    /** STOMP 클라이언트 → 서버. 베팅 금액은 보내지 않는다 (서버가 계산) */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Action {
        public enum Type { START, BET, CHAT, LEAVE }

        private Type type;
        private String bet; // die, check, call, bbing, half
        private String text;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Event {
        public enum Type { STATE, HAND, CHAT, CLOSED, ERROR }

        private Type type;
        private RoomState state;
        private Integer handNo;
        private List<Integer> cards;
        private String sender;
        private String text;
    }
}
