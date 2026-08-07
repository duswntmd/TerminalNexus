package kr.pe.tn.domain.chat.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 채팅 메시지 영속성 엔티티
 *
 * - CHAT 타입 메시지만 저장 (JOIN/LEAVE/WHISPER 제외)
 * - 익명 채팅: sender = "익명", sender_id = 실제 ID (내부 저장용)
 * - 인덱스: (room_id, created_at DESC) → 채팅방별 최신순 조회 최적화
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "chat_message",
    indexes = {
        @Index(name = "idx_chat_room_created", columnList = "room_id, created_at DESC")
    }
)
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 채팅방 ID ("public" | "anonymous") */
    @Column(name = "room_id", nullable = false, length = 50)
    private String roomId;

    /** 표시용 발신자 이름 (익명 채팅이면 "익명") */
    @Column(name = "sender", nullable = false, length = 50)
    private String sender;

    /**
     * 실제 발신자 ID (익명 채팅도 DB에는 저장 — 운영 목적)
     * 프론트엔드에는 절대 노출 금지
     */
    @Column(name = "sender_id", length = 100)
    private String senderId;

    /** 메시지 내용 */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** 익명 여부 */
    @Column(name = "is_anonymous", nullable = false)
    private boolean anonymous;

    /** 채팅방 타입 ("PUBLIC" | "ANONYMOUS") */
    @Column(name = "room_type", length = 20)
    private String roomType;

    /** 저장 시각 (JPA Auditing 자동 설정) */
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public String getRoomId() { return roomId; }
    public String getSender() { return sender; }
    public String getSenderId() { return senderId; }
    public String getContent() { return content; }
    public boolean isAnonymous() { return anonymous; }
    public String getRoomType() { return roomType; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public static ChatMessageEntityBuilder builder() { return new ChatMessageEntityBuilder(); }

    public static class ChatMessageEntityBuilder {
        private String roomId;
        private String sender;
        private String senderId;
        private String content;
        private boolean anonymous;
        private String roomType;

        public ChatMessageEntityBuilder roomId(String roomId) { this.roomId = roomId; return this; }
        public ChatMessageEntityBuilder sender(String sender) { this.sender = sender; return this; }
        public ChatMessageEntityBuilder senderId(String senderId) { this.senderId = senderId; return this; }
        public ChatMessageEntityBuilder content(String content) { this.content = content; return this; }
        public ChatMessageEntityBuilder anonymous(boolean anonymous) { this.anonymous = anonymous; return this; }
        public ChatMessageEntityBuilder roomType(String roomType) { this.roomType = roomType; return this; }

        public ChatMessageEntity build() {
            ChatMessageEntity e = new ChatMessageEntity();
            e.roomId = this.roomId;
            e.sender = this.sender;
            e.senderId = this.senderId;
            e.content = this.content;
            e.anonymous = this.anonymous;
            e.roomType = this.roomType;
            return e;
        }
    }
}
