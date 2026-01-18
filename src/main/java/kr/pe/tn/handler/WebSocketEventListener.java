package kr.pe.tn.handler;

import kr.pe.tn.domain.chat.dto.ChatMessage;
import kr.pe.tn.domain.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/**
 * WebSocket 이벤트 리스너
 * 사용자 연결/해제 이벤트 처리
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;

    /**
     * WebSocket 연결 이벤트
     */
    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        log.info("새로운 WebSocket 연결");
    }

    /**
     * WebSocket 연결 해제 이벤트
     * 사용자가 채팅방을 나갈 때 퇴장 메시지 전송
     */
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());

        String username = (String) headerAccessor.getSessionAttributes().get("username");
        String roomId = (String) headerAccessor.getSessionAttributes().get("roomId");

        if (username != null && roomId != null) {
            log.info("[{}] 사용자 연결 해제: {}", roomId, username);

            // 채팅방에서 사용자 제거
            chatService.removeUser(roomId, username);

            // 퇴장 메시지 생성 및 전송
            ChatMessage leaveMessage = ChatMessage.createLeave(username, roomId);
            messagingTemplate.convertAndSend("/topic/" + roomId, leaveMessage);
        }
    }
}
