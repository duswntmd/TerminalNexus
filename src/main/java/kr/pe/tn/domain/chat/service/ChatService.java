package kr.pe.tn.domain.chat.service;

import kr.pe.tn.domain.chat.dto.ChatHistoryResponseDTO;
import kr.pe.tn.domain.chat.dto.ChatMessage;
import kr.pe.tn.domain.chat.dto.ChatRoom;
import kr.pe.tn.domain.chat.entity.ChatMessageEntity;
import kr.pe.tn.domain.chat.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 채팅 서비스
 *
 * 메시지 저장 전략:
 * - CHAT 타입만 DB 저장 (JOIN/LEAVE/WHISPER 제외)
 * - @Async로 비동기 저장 → WebSocket 응답 지연 없음
 * - 히스토리 조회: 최신 100건 역순(시간순) 반환
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;

    // ──────────────────────────────────────────────
    // 메모리 기반 채팅방 & 세션 관리 (기존 유지)
    // ──────────────────────────────────────────────

    /** 채팅방 저장소 */
    private final Map<String, ChatRoom> chatRooms = new ConcurrentHashMap<>();

    /** 사용자별 세션 정보 (username → sessionId) */
    private final Map<String, String> userSessions = new ConcurrentHashMap<>();

    /** 기본 채팅방 초기화 */
    @PostConstruct
    private void initRooms() {
        chatRooms.put("public", ChatRoom.createPublicRoom());
        chatRooms.put("anonymous", ChatRoom.createAnonymousRoom());
    }

    // ── 채팅방 관리 ──

    public List<ChatRoom> getAllRooms() {
        return new ArrayList<>(chatRooms.values());
    }

    public ChatRoom getRoom(String roomId) {
        return chatRooms.get(roomId);
    }

    public ChatRoom getOrCreatePrivateRoom(String user1, String user2) {
        String roomId = generatePrivateRoomId(user1, user2);
        return chatRooms.computeIfAbsent(roomId, k -> {
            log.info("새로운 1:1 채팅방 생성: {} <-> {}", user1, user2);
            return ChatRoom.createPrivateRoom(user1, user2);
        });
    }

    // ── 사용자 세션 관리 ──

    public void addUser(String roomId, String username, String sessionId) {
        ChatRoom room = chatRooms.get(roomId);
        if (room != null) {
            room.addUser(username);
            userSessions.put(username, sessionId);
            log.info("사용자 입장: {} -> 채팅방: {} (현재 인원: {})",
                    username, room.getRoomName(), room.getUserCount());
        }
    }

    public void removeUser(String roomId, String username) {
        ChatRoom room = chatRooms.get(roomId);
        if (room != null) {
            room.removeUser(username);
            userSessions.remove(username);
            log.info("사용자 퇴장: {} <- 채팅방: {} (현재 인원: {})",
                    username, room.getRoomName(), room.getUserCount());
        }
    }

    public boolean isUserOnline(String username) {
        return userSessions.containsKey(username);
    }

    public Set<String> getOnlineUsers() {
        return new HashSet<>(userSessions.keySet());
    }

    // ──────────────────────────────────────────────
    // DB 저장 (비동기)
    // ──────────────────────────────────────────────

    /**
     * 채팅 메시지 비동기 저장
     *
     * - CHAT 타입만 저장 (JOIN/LEAVE/WHISPER 제외)
     * - 익명 채팅: sender = "익명", senderId = 실제 ID (DB 저장, 프론트 비노출)
     * - @Async: WebSocket 응답 스레드를 블로킹하지 않음
     *
     * @param chatMessage 저장할 메시지
     */
    @Async("chatSaveExecutor")
    @Transactional
    public void saveMessageAsync(ChatMessage chatMessage) {
        // CHAT 타입만 저장
        if (chatMessage.getType() != ChatMessage.MessageType.CHAT) {
            return;
        }
        // WHISPER는 개인 간 대화 → 저장 안 함
        if (chatMessage.getRoomType() == ChatMessage.RoomType.PRIVATE) {
            return;
        }

        try {
            ChatMessageEntity entity = ChatMessageEntity.builder()
                    .roomId(chatMessage.getRoomId())
                    .sender(chatMessage.isAnonymous() ? "익명" : chatMessage.getSender())
                    .senderId(chatMessage.getSenderId()) // 실제 ID는 DB에만 저장
                    .content(chatMessage.getContent())
                    .anonymous(chatMessage.isAnonymous())
                    .roomType(chatMessage.getRoomType() != null
                            ? chatMessage.getRoomType().name()
                            : "PUBLIC")
                    .build();

            chatMessageRepository.save(entity);
            log.debug("[채팅 저장] roomId={}, sender={}", chatMessage.getRoomId(), entity.getSender());

        } catch (Exception e) {
            log.error("[채팅 저장 실패] roomId={}, 오류={}", chatMessage.getRoomId(), e.getMessage(), e);
        }
    }

    // ──────────────────────────────────────────────
    // 히스토리 조회
    // ──────────────────────────────────────────────

    /**
     * 채팅방 최근 메시지 100건 조회 (시간 오름차순)
     *
     * - DB에서 최신 100건 역순 조회 → Collections.reverse() 로 시간순 정렬
     * - isOwner: 요청자 ID와 DB의 senderId를 서버에서 비교 → 클라이언트에 boolean만 전달
     *   → 익명 채팅에서도 본인 메시지를 오른쪽에 표시 가능 (senderId 비노출 유지)
     *
     * @param roomId      채팅방 ID
     * @param requesterId 현재 요청자의 username (본인 메시지 판별용)
     * @return 시간순 메시지 목록 (최대 100건)
     */
    @Transactional(readOnly = true)
    public List<ChatHistoryResponseDTO> getChatHistory(String roomId, String requesterId) {
        List<ChatMessageEntity> messages = chatMessageRepository.findRecentMessages(
                roomId,
                PageRequest.of(0, 100)
        );

        // DB에서 역순(최신→오래된)으로 왔으므로 뒤집어서 시간순(오래된→최신) 반환
        Collections.reverse(messages);

        return messages.stream()
                .map(entity -> ChatHistoryResponseDTO.from(entity, requesterId))
                .collect(Collectors.toList());
    }

    // ──────────────────────────────────────────────
    // 내부 유틸
    // ──────────────────────────────────────────────

    private String generatePrivateRoomId(String user1, String user2) {
        return user1.compareTo(user2) < 0
                ? "private_" + user1 + "_" + user2
                : "private_" + user2 + "_" + user1;
    }
}
