package kr.pe.tn.api;

import kr.pe.tn.domain.chat.dto.ChatHistoryResponseDTO;
import kr.pe.tn.domain.chat.dto.ChatMessage;
import kr.pe.tn.domain.chat.dto.ChatRoom;
import kr.pe.tn.domain.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * 채팅 WebSocket + REST 컨트롤러
 *
 * WebSocket 경로:
 * - /app/chat.sendMessage/{roomId} : 메시지 전송
 * - /app/chat.addUser/{roomId}     : 사용자 입장
 * - /app/chat.whisper              : 귓속말 전송
 *
 * REST 경로:
 * - GET /api/chat/history/{roomId} : 채팅 히스토리 조회 (최근 100건)
 * - GET /api/chat/users            : 온라인 사용자 목록
 * - GET /api/chat/rooms            : 채팅방 목록
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 메시지 전송 (WebSocket)
     * 클라이언트 → /app/chat.sendMessage/{roomId}
     * 서버 브로드캐스트 → /topic/{roomId}
     */
    @MessageMapping("/chat.sendMessage/{roomId}")
    @SendTo("/topic/{roomId}")
    public ChatMessage sendMessage(@DestinationVariable String roomId,
            @Payload ChatMessage chatMessage) {

        chatMessage.setTimestamp(LocalDateTime.now());
        chatMessage.setRoomId(roomId);

        log.info("[{}] {} : {}", roomId, chatMessage.getSender(), chatMessage.getContent());

        // CHAT 타입만 비동기로 DB 저장 (WebSocket 응답 지연 없음)
        chatService.saveMessageAsync(chatMessage);

        return chatMessage;
    }

    /**
     * 사용자 입장 (WebSocket)
     * 클라이언트 → /app/chat.addUser/{roomId}
     * 서버 브로드캐스트 → /topic/{roomId}
     */
    @MessageMapping("/chat.addUser/{roomId}")
    @SendTo("/topic/{roomId}")
    public ChatMessage addUser(@DestinationVariable String roomId,
            @Payload ChatMessage chatMessage,
            SimpMessageHeaderAccessor headerAccessor) {

        String username = chatMessage.getSender();
        String sessionId = headerAccessor.getSessionId();

        // 세션에 사용자 정보 저장
        headerAccessor.getSessionAttributes().put("username", username);
        headerAccessor.getSessionAttributes().put("roomId", roomId);

        // 채팅방에 사용자 추가
        chatService.addUser(roomId, username, sessionId);

        // 입장 메시지 생성 (저장 안 함)
        ChatMessage joinMessage = ChatMessage.createJoin(username, roomId);

        log.info("[{}] 사용자 입장: {}", roomId, username);

        return joinMessage;
    }

    /**
     * 귓속말 전송 (WebSocket) — DB 저장 안 함 (프라이버시)
     * 클라이언트 → /app/chat.whisper
     * 서버 → /user/{receiver}/queue/whisper
     */
    @MessageMapping("/chat.whisper")
    public void sendWhisper(@Payload ChatMessage chatMessage) {

        String receiver = chatMessage.getReceiver();

        // 수신자 오프라인 처리
        if (!chatService.isUserOnline(receiver)) {
            ChatMessage errorMessage = ChatMessage.builder()
                    .type(ChatMessage.MessageType.CHAT)
                    .content("❌ " + receiver + "님은 현재 오프라인입니다.")
                    .sender("시스템")
                    .timestamp(LocalDateTime.now())
                    .build();

            messagingTemplate.convertAndSendToUser(
                    chatMessage.getSender(),
                    "/queue/whisper",
                    errorMessage);
            return;
        }

        chatMessage.setTimestamp(LocalDateTime.now());

        // 수신자에게 귓속말 전송
        messagingTemplate.convertAndSendToUser(
                receiver,
                "/queue/whisper",
                chatMessage);

        // 발신자에게도 전송 (본인 확인용)
        messagingTemplate.convertAndSendToUser(
                chatMessage.getSender(),
                "/queue/whisper",
                chatMessage);

        log.info("[귓속말] {} -> {} : {}",
                chatMessage.getSender(), receiver, chatMessage.getContent());
    }

    // ──────────────────────────────────────────────
    // REST API
    // ──────────────────────────────────────────────

    /**
     * 채팅 히스토리 조회
     * GET /api/chat/history/{roomId}
     *
     * - 최근 100건, 시간 오름차순
     * - 익명 채팅: senderId 미포함, sender = "익명"
     * - isOwner: 서버에서 senderId 비교 후 boolean만 응답 (익명 보호)
     *
     * ⚠️ JWTFilter에서 principal을 String(username)으로 설정하므로
     *    @AuthenticationPrincipal UserDetails는 null이 됨 → Principal 사용
     */
    @GetMapping("/api/chat/history/{roomId}")
    @ResponseBody
    public List<ChatHistoryResponseDTO> getChatHistory(
            @PathVariable String roomId,
            Principal principal) {

        // JWTFilter에서 설정한 principal.getName() = username
        String requesterId = principal != null ? principal.getName() : null;
        log.debug("[히스토리 조회] roomId={}, requesterId={}", roomId, requesterId);
        return chatService.getChatHistory(roomId, requesterId);
    }

    /**
     * 채팅방 목록 조회
     * GET /api/chat/rooms
     */
    @GetMapping("/api/chat/rooms")
    @ResponseBody
    public List<ChatRoom> getRooms() {
        return chatService.getAllRooms();
    }

    /**
     * 온라인 사용자 목록 조회
     * GET /api/chat/users
     */
    @GetMapping("/api/chat/users")
    @ResponseBody
    public Set<String> getOnlineUsers() {
        return chatService.getOnlineUsers();
    }
}
