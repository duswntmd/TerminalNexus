package kr.pe.tn.api;

import kr.pe.tn.domain.janggi.dto.JanggiDTO;
import kr.pe.tn.domain.janggi.entity.JanggiRoom;
import kr.pe.tn.domain.janggi.service.JanggiRoomService;
import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * 실시간 온라인 장기 (REST: 로비/입장, STOMP: 대국 진행)
 *
 * 대국자 확인은 로그인 정보로만 한다.
 * - REST: principal = username → 닉네임 조회
 * - STOMP: principal = 닉네임 (WebSocketConfig 의 CONNECT 인증)
 */
@RestController
@RequiredArgsConstructor
public class JanggiGameController {

    private final JanggiRoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    private String nicknameOf(Principal principal) {
        return userRepository.findByUsernameAndIsLock(principal.getName(), false)
                .map(UserEntity::getNickname)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
    }

    private void broadcast(JanggiRoom room) {
        messagingTemplate.convertAndSend("/topic/janggi/room/" + room.getRoomId(),
                JanggiDTO.Event.builder().type(JanggiDTO.Event.Type.STATE).state(room.toState()).build());
    }

    @GetMapping("/api/janggi/rooms")
    public List<JanggiDTO.RoomSummary> getRooms() {
        return roomService.getAllRooms();
    }

    @GetMapping("/api/janggi/room/{roomId}")
    public JanggiDTO.RoomState getRoom(@PathVariable("roomId") String roomId) {
        return roomService.getRoom(roomId).toState();
    }

    @PostMapping("/api/janggi/room")
    public JanggiDTO.RoomState createRoom(@RequestBody JanggiDTO.CreateRoomRequest req, Principal principal) {
        return roomService.createRoom(nicknameOf(principal), req).toState();
    }

    /** 입장: 빈 자리가 있으면 대국자로 착석, 없으면 관전 */
    @PostMapping("/api/janggi/room/{roomId}/join")
    public JanggiDTO.RoomState joinRoom(@PathVariable("roomId") String roomId, Principal principal) {
        JanggiRoom room = roomService.getRoom(roomId);
        room.join(nicknameOf(principal));
        broadcast(room);
        return room.toState();
    }

    /** 방 삭제 (방장 전용) */
    @DeleteMapping("/api/janggi/room/{roomId}")
    public ResponseEntity<Void> deleteRoom(@PathVariable("roomId") String roomId, Principal principal) {
        JanggiRoom room = roomService.getRoom(roomId);
        if (!room.getHost().equals(nicknameOf(principal))) {
            return ResponseEntity.status(403).build();
        }
        roomService.removeRoom(roomId);
        messagingTemplate.convertAndSend("/topic/janggi/room/" + roomId,
                JanggiDTO.Event.builder().type(JanggiDTO.Event.Type.CLOSED).text("방장이 방을 닫았습니다.").build());
        return ResponseEntity.ok().build();
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> notFound(NoSuchElementException e) {
        return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
    }

    /**
     * 대국 진행: /app/janggi/room/{roomId}/action
     * 처리 후 방 전체 상태를 /topic/janggi/room/{roomId} 로 방송, 오류는 보낸 사람에게만 전달
     */
    @MessageMapping("/janggi/room/{roomId}/action")
    public void action(@DestinationVariable("roomId") String roomId,
                       @Payload JanggiDTO.Action action,
                       Principal principal) {
        if (principal == null || action.getType() == null) return;
        String nick = principal.getName();
        try {
            JanggiRoom room = roomService.getRoom(roomId);
            switch (action.getType()) {
                case FORMATION -> room.setFormation(nick, action.getFormation());
                case START -> room.start(nick);
                case MOVE -> {
                    if (action.getFrom() == null || action.getTo() == null) throw new IllegalArgumentException("잘못된 수입니다.");
                    room.move(nick, action.getFrom(), action.getTo());
                }
                case PASS -> room.pass(nick);
                case RESIGN -> room.resign(nick);
                case REMATCH -> room.rematch(nick);
                case LEAVE -> {
                    if (room.leave(nick)) {
                        roomService.removeRoom(roomId);
                        messagingTemplate.convertAndSend("/topic/janggi/room/" + roomId,
                                JanggiDTO.Event.builder().type(JanggiDTO.Event.Type.CLOSED).text("방장이 나가 방이 닫혔습니다.").build());
                        return;
                    }
                }
                case CHAT -> {
                    String text = action.getText() == null ? "" : action.getText().strip();
                    if (text.isEmpty()) return;
                    messagingTemplate.convertAndSend("/topic/janggi/room/" + roomId,
                            JanggiDTO.Event.builder().type(JanggiDTO.Event.Type.CHAT)
                                    .sender(nick).text(text.substring(0, Math.min(text.length(), 200))).build());
                    return;
                }
            }
            broadcast(room);
        } catch (RuntimeException e) {
            messagingTemplate.convertAndSendToUser(nick, "/queue/janggi",
                    JanggiDTO.Event.builder().type(JanggiDTO.Event.Type.ERROR).text(e.getMessage()).build());
        }
    }
}
