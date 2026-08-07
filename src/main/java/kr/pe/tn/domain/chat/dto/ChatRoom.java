package kr.pe.tn.domain.chat.dto;

import lombok.*;

import java.util.HashSet;
import java.util.Set;

/**
 * 채팅방 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoom {

    private String roomId; // 채팅방 ID
    private String roomName; // 채팅방 이름
    private ChatMessage.RoomType roomType; // 채팅방 타입
    private Set<String> participants; // 참여자 목록 (닉네임)
    private int userCount; // 현재 인원

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getRoomName() { return roomName; }
    public void setRoomName(String roomName) { this.roomName = roomName; }
    public ChatMessage.RoomType getRoomType() { return roomType; }
    public void setRoomType(ChatMessage.RoomType roomType) { this.roomType = roomType; }
    public Set<String> getParticipants() { return participants; }
    public void setParticipants(Set<String> participants) { this.participants = participants; }
    public int getUserCount() { return userCount; }
    public void setUserCount(int userCount) { this.userCount = userCount; }

    /**
     * 전체 채팅방 생성
     */
    public static ChatRoom createPublicRoom() {
        return ChatRoom.builder()
                .roomId("public")
                .roomName("전체 채팅")
                .roomType(ChatMessage.RoomType.PUBLIC)
                .participants(new HashSet<>())
                .userCount(0)
                .build();
    }

    /**
     * 익명 채팅방 생성
     */
    public static ChatRoom createAnonymousRoom() {
        return ChatRoom.builder()
                .roomId("anonymous")
                .roomName("익명 채팅")
                .roomType(ChatMessage.RoomType.ANONYMOUS)
                .participants(new HashSet<>())
                .userCount(0)
                .build();
    }

    /**
     * 1:1 채팅방 생성
     */
    public static ChatRoom createPrivateRoom(String user1, String user2) {
        String roomId = generatePrivateRoomId(user1, user2);
        Set<String> participants = new HashSet<>();
        participants.add(user1);
        participants.add(user2);

        return ChatRoom.builder()
                .roomId(roomId)
                .roomName(user1 + " & " + user2)
                .roomType(ChatMessage.RoomType.PRIVATE)
                .participants(participants)
                .userCount(2)
                .build();
    }

    /**
     * 1:1 채팅방 ID 생성 (알파벳 순으로 정렬하여 일관성 유지)
     */
    private static String generatePrivateRoomId(String user1, String user2) {
        return user1.compareTo(user2) < 0
                ? "private_" + user1 + "_" + user2
                : "private_" + user2 + "_" + user1;
    }

    /**
     * 사용자 추가
     */
    public void addUser(String username) {
        if (participants == null) {
            participants = new HashSet<>();
        }
        participants.add(username);
        userCount = participants.size();
    }

    public void removeUser(String username) {
        if (participants != null) {
            participants.remove(username);
            userCount = participants.size();
        }
    }

    public static ChatRoomBuilder builder() {
        return new ChatRoomBuilder();
    }

    public static class ChatRoomBuilder {
        private String roomId;
        private String roomName;
        private ChatMessage.RoomType roomType;
        private Set<String> participants;
        private int userCount;

        public ChatRoomBuilder roomId(String roomId) { this.roomId = roomId; return this; }
        public ChatRoomBuilder roomName(String roomName) { this.roomName = roomName; return this; }
        public ChatRoomBuilder roomType(ChatMessage.RoomType roomType) { this.roomType = roomType; return this; }
        public ChatRoomBuilder participants(Set<String> participants) { this.participants = participants; return this; }
        public ChatRoomBuilder userCount(int userCount) { this.userCount = userCount; return this; }

        public ChatRoom build() {
            ChatRoom room = new ChatRoom();
            room.setRoomId(roomId);
            room.setRoomName(roomName);
            room.setRoomType(roomType);
            room.setParticipants(participants);
            room.setUserCount(userCount);
            return room;
        }
    }
}
