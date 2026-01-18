package kr.pe.tn.domain.chat.dto;

import lombok.*;

import java.time.LocalDateTime;

/**
 * 채팅 메시지 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    /**
     * 메시지 타입
     */
    public enum MessageType {
        CHAT, // 일반 채팅
        JOIN, // 입장
        LEAVE, // 퇴장
        WHISPER // 귓속말
    }

    /**
     * 채팅방 타입
     */
    public enum RoomType {
        PUBLIC, // 전체 채팅
        PRIVATE, // 1:1 채팅
        ANONYMOUS // 익명 채팅
    }

    private MessageType type; // 메시지 타입
    private RoomType roomType; // 채팅방 타입
    private String roomId; // 채팅방 ID
    private String content; // 메시지 내용
    private String sender; // 발신자 닉네임
    private String senderId; // 발신자 ID
    private String receiver; // 수신자 닉네임 (귓속말용)
    private String receiverId; // 수신자 ID (귓속말용)
    private LocalDateTime timestamp; // 전송 시간
    private boolean isAnonymous; // 익명 여부

    /**
     * 익명 메시지 생성
     */
    public static ChatMessage createAnonymous(String content, String roomId) {
        return ChatMessage.builder()
                .type(MessageType.CHAT)
                .roomType(RoomType.ANONYMOUS)
                .content(content)
                .sender("익명")
                .roomId(roomId)
                .timestamp(LocalDateTime.now())
                .isAnonymous(true)
                .build();
    }

    /**
     * 일반 메시지 생성
     */
    public static ChatMessage createNormal(String content, String sender, String senderId, String roomId) {
        return ChatMessage.builder()
                .type(MessageType.CHAT)
                .roomType(RoomType.PUBLIC)
                .content(content)
                .sender(sender)
                .senderId(senderId)
                .roomId(roomId)
                .timestamp(LocalDateTime.now())
                .isAnonymous(false)
                .build();
    }

    /**
     * 귓속말 메시지 생성
     */
    public static ChatMessage createWhisper(String content, String sender, String senderId,
            String receiver, String receiverId, String roomId) {
        return ChatMessage.builder()
                .type(MessageType.WHISPER)
                .roomType(RoomType.PUBLIC)
                .content(content)
                .sender(sender)
                .senderId(senderId)
                .receiver(receiver)
                .receiverId(receiverId)
                .roomId(roomId)
                .timestamp(LocalDateTime.now())
                .isAnonymous(false)
                .build();
    }

    /**
     * 입장 메시지 생성
     */
    public static ChatMessage createJoin(String sender, String roomId) {
        return ChatMessage.builder()
                .type(MessageType.JOIN)
                .sender(sender)
                .roomId(roomId)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * 퇴장 메시지 생성
     */
    public static ChatMessage createLeave(String sender, String roomId) {
        return ChatMessage.builder()
                .type(MessageType.LEAVE)
                .sender(sender)
                .roomId(roomId)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
