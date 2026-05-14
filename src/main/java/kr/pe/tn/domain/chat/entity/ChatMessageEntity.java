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
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
