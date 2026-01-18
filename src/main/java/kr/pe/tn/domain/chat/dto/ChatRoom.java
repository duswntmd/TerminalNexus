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

    /**
     * 사용자 제거
     */
    public void removeUser(String username) {
        if (participants != null) {
            participants.remove(username);
            userCount = participants.size();
        }
    }
}
