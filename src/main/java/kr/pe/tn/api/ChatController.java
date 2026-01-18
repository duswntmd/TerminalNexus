package kr.pe.tn.api;

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
import org.springframework.web.bind.annotation.ResponseBody;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * 채팅 WebSocket 컨트롤러
 * 
 * 메시지 경로:
 * - /app/chat.sendMessage/{roomId} : 메시지 전송
 * - /app/chat.addUser/{roomId} : 사용자 입장
 * - /app/chat.whisper : 귓속말 전송
 * 
 * 구독 경로:
 * - /topic/public : 전체 채팅
 * - /topic/anonymous : 익명 채팅
 * - /topic/private/{roomId} : 1:1 채팅
 * - /user/queue/whisper : 귓속말 수신
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 메시지 전송
     * 클라이언트 -> /app/chat.sendMessage/{roomId}
     * 서버 -> /topic/{roomId}
     */
    @MessageMapping("/chat.sendMessage/{roomId}")
    @SendTo("/topic/{roomId}")
    public ChatMessage sendMessage(@DestinationVariable String roomId,
            @Payload ChatMessage chatMessage) {

        chatMessage.setTimestamp(LocalDateTime.now());
        chatMessage.setRoomId(roomId);

        log.info("[{}] {} : {}", roomId, chatMessage.getSender(), chatMessage.getContent());

        return chatMessage;
    }

    /**
     * 사용자 입장
     * 클라이언트 -> /app/chat.addUser/{roomId}
     * 서버 -> /topic/{roomId}
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

        // 입장 메시지 생성
        ChatMessage joinMessage = ChatMessage.createJoin(username, roomId);

        log.info("[{}] 사용자 입장: {}", roomId, username);

        return joinMessage;
    }

    /**
     * 귓속말 전송
     * 클라이언트 -> /app/chat.whisper
     * 서버 -> /user/{receiver}/queue/whisper
     */
    @MessageMapping("/chat.whisper")
    public void sendWhisper(@Payload ChatMessage chatMessage) {

        String receiver = chatMessage.getReceiver();

        // 수신자가 온라인인지 확인
        if (!chatService.isUserOnline(receiver)) {
            // 발신자에게 오류 메시지 전송
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

        // 발신자에게도 전송 (본인이 보낸 메시지 확인용)
        messagingTemplate.convertAndSendToUser(
                chatMessage.getSender(),
                "/queue/whisper",
                chatMessage);

        log.info("[귓속말] {} -> {} : {}",
                chatMessage.getSender(), receiver, chatMessage.getContent());
    }

    /**
     * 채팅방 목록 조회 (REST API)
     */
    @GetMapping("/api/chat/rooms")
    @ResponseBody
    public List<ChatRoom> getRooms() {
        return chatService.getAllRooms();
    }

    /**
     * 온라인 사용자 목록 조회 (REST API)
     */
    @GetMapping("/api/chat/users")
    @ResponseBody
    public Set<String> getOnlineUsers() {
        return chatService.getOnlineUsers();
    }
}
