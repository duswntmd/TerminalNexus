package kr.pe.tn.domain.janggi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 실시간 온라인 장기 DTO
 */
public class JanggiDTO {

    /**
     * 방 생성 요청 DTO
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRoomRequest {
        private String title;
        private String hostNickname;
        private String preferredTeam; // "CHO" or "HAN"
        private String formation;     // "N_E_N_E", etc.
    }

    /**
     * 방 응답 DTO
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RoomResponse {
        private String roomId;
        private String title;
        private String hostNickname;
        private String guestNickname;
        private String choNickname;
        private String hanNickname;
        private String choFormation;
        private String hanFormation;
        private String status; // "WAITING", "PLAYING", "FINISHED"
        private String currentTurn; // "CHO" or "HAN"
        private int userCount;
    }

    /**
     * STOMP 대국 메시지 DTO
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GameMessage {
        public enum MessageType {
            JOIN, READY, START, MOVE, PASS, RESIGN, CHAT, RESTART, LEAVE
        }

        private MessageType type;
        private String roomId;
        private String sender;
        private String team; // "CHO" or "HAN"
        private Integer fromX;
        private Integer fromY;
        private Integer toX;
        private Integer toY;
        private String text; // 채팅 메시지 또는 상차림 정보
        private String choFormation;
        private String hanFormation;
        private String currentTurn;
        private String status;
    }
}
