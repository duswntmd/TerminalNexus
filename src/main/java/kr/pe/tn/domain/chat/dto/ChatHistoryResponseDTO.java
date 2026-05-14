package kr.pe.tn.domain.chat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import kr.pe.tn.domain.chat.entity.ChatMessageEntity;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 채팅 히스토리 응답 DTO
 *
 * - senderId(실제 ID)는 절대 포함하지 않음 (익명 보호)
 * - sender: 익명 채팅이면 "익명", 전체 채팅이면 실제 닉네임
 * - isOwner: 현재 요청한 사용자가 보낸 메시지 여부
 *            → 익명 채팅에서도 본인 메시지를 오른쪽에 표시하기 위해 필요
 *            → senderId를 직접 노출하지 않고 서버에서 비교 후 boolean만 전달
 */
@Getter
public class ChatHistoryResponseDTO {

    private final String roomId;
    private final String sender;   // 표시명 ("익명" 또는 실제 닉네임)
    private final String content;
    private final String type;     // 항상 "CHAT"
    private final String roomType; // "PUBLIC" | "ANONYMOUS"
    /** JSON 직렬화 시 "is" 접두사 자동 제거 방지 → "isAnonymous" 키로 응답 */
    @JsonProperty("isAnonymous")
    private final boolean isAnonymous;
    private final LocalDateTime timestamp;

    /**
     * 현재 요청자가 보낸 메시지인지 여부
     * - 익명 채팅: senderId로 서버에서 비교 (클라이언트에는 boolean만 전달)
     * - 전체 채팅: sender(닉네임)로 프론트에서 비교 가능하지만 통일성을 위해 서버 계산
     */
    /** JSON 직렬화 시 "is" 접두사 자동 제거 방지 → "isOwner" 키로 응답 */
    @JsonProperty("isOwner")
    private final boolean isOwner;

    private ChatHistoryResponseDTO(ChatMessageEntity entity, String requesterId) {
        this.roomId = entity.getRoomId();
        // 익명 채팅: 어떤 경우도 "익명"으로만 노출
        this.sender = entity.isAnonymous() ? "익명" : entity.getSender();
        this.content = entity.getContent();
        this.type = "CHAT";
        this.roomType = entity.getRoomType();
        this.isAnonymous = entity.isAnonymous();
        this.timestamp = entity.getCreatedAt();
        // senderId를 서버에서 비교하여 boolean만 응답 (실제 ID 비노출)
        this.isOwner = requesterId != null
                && requesterId.equals(entity.getSenderId());
    }

    /**
     * Entity → DTO 변환 팩토리 메서드
     *
     * @param entity     채팅 메시지 엔티티
     * @param requesterId 현재 요청자 ID (senderId와 비교용, 응답에 포함 안 됨)
     */
    public static ChatHistoryResponseDTO from(ChatMessageEntity entity, String requesterId) {
        return new ChatHistoryResponseDTO(entity, requesterId);
    }
}
