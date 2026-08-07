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

    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }
    public RoomType getRoomType() { return roomType; }
    public void setRoomType(RoomType roomType) { this.roomType = roomType; }
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }
    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }
    public String getReceiver() { return receiver; }
    public void setReceiver(String receiver) { this.receiver = receiver; }
    public String getReceiverId() { return receiverId; }
    public void setReceiverId(String receiverId) { this.receiverId = receiverId; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public boolean isAnonymous() { return isAnonymous; }
    public void setAnonymous(boolean anonymous) { isAnonymous = anonymous; }

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

    public static ChatMessage createLeave(String sender, String roomId) {
        return ChatMessage.builder()
                .type(MessageType.LEAVE)
                .sender(sender)
                .roomId(roomId)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static ChatMessageBuilder builder() {
        return new ChatMessageBuilder();
    }

    public static class ChatMessageBuilder {
        private MessageType type;
        private RoomType roomType;
        private String roomId;
        private String content;
        private String sender;
        private String senderId;
        private String receiver;
        private String receiverId;
        private LocalDateTime timestamp;
        private boolean isAnonymous;

        public ChatMessageBuilder type(MessageType type) { this.type = type; return this; }
        public ChatMessageBuilder roomType(RoomType roomType) { this.roomType = roomType; return this; }
        public ChatMessageBuilder roomId(String roomId) { this.roomId = roomId; return this; }
        public ChatMessageBuilder content(String content) { this.content = content; return this; }
        public ChatMessageBuilder sender(String sender) { this.sender = sender; return this; }
        public ChatMessageBuilder senderId(String senderId) { this.senderId = senderId; return this; }
        public ChatMessageBuilder receiver(String receiver) { this.receiver = receiver; return this; }
        public ChatMessageBuilder receiverId(String receiverId) { this.receiverId = receiverId; return this; }
        public ChatMessageBuilder timestamp(LocalDateTime timestamp) { this.timestamp = timestamp; return this; }
        public ChatMessageBuilder isAnonymous(boolean isAnonymous) { this.isAnonymous = isAnonymous; return this; }

        public ChatMessage build() {
            ChatMessage msg = new ChatMessage();
            msg.setType(type);
            msg.setRoomType(roomType);
            msg.setRoomId(roomId);
            msg.setContent(content);
            msg.setSender(sender);
            msg.setSenderId(senderId);
            msg.setReceiver(receiver);
            msg.setReceiverId(receiverId);
            msg.setTimestamp(timestamp);
            msg.setAnonymous(isAnonymous);
            return msg;
        }
    }
}
