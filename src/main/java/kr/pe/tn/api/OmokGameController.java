package kr.pe.tn.api;

import kr.pe.tn.domain.omok.dto.OmokDTO;
import kr.pe.tn.domain.omok.entity.OmokRoom;
import kr.pe.tn.domain.omok.service.OmokRoomService;
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
 * 실시간 온라인 오목 (REST: 로비/입장, STOMP: 대국 진행). 체스(ChessGameController)와 같은 방식.
 *
 * 대국자 확인은 로그인 정보로만 한다.
 * - REST: principal = username → 닉네임 조회
 * - STOMP: principal = 닉네임 (WebSocketConfig 의 CONNECT 인증)
 * 착수는 서버 규칙(OmokRules)으로 검증하고, 빈칸이 아니거나 금수면 거부한다.
 */
@RestController
@RequiredArgsConstructor
public class OmokGameController {

    private final OmokRoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    private String nicknameOf(Principal principal) {
        return userRepository.findByUsernameAndIsLock(principal.getName(), false)
                .map(UserEntity::getNickname)
                .orElseThrow(() -> new IllegalStateException("user_not_found"));
    }

    @GetMapping("/api/omok/rooms")
    public List<OmokDTO.RoomSummary> getRooms() {
        return roomService.getAllRooms();
    }

    @GetMapping("/api/omok/room/{roomId}")
    public OmokDTO.RoomState getRoom(@PathVariable("roomId") String roomId) {
        return roomService.getRoom(roomId).toState();
    }

    @PostMapping("/api/omok/room")
    public OmokDTO.RoomState createRoom(@RequestBody OmokDTO.CreateRoomRequest req, Principal principal) {
        return roomService.createRoom(nicknameOf(principal), req).toState();
    }

    /** 입장: 빈 자리가 있으면 대국자로 착석, 없으면 관전 */
    @PostMapping("/api/omok/room/{roomId}/join")
    public OmokDTO.RoomState joinRoom(@PathVariable("roomId") String roomId, Principal principal) {
        OmokRoom room = roomService.getRoom(roomId);
        room.join(nicknameOf(principal));
        roomService.broadcast(room);
        return room.toState();
    }

    /** 방 삭제 (방장 전용) */
    @DeleteMapping("/api/omok/room/{roomId}")
    public ResponseEntity<Void> deleteRoom(@PathVariable("roomId") String roomId, Principal principal) {
        OmokRoom room = roomService.getRoom(roomId);
        if (!room.getHost().equals(nicknameOf(principal))) {
            return ResponseEntity.status(403).build();
        }
        roomService.removeRoom(roomId);
        roomService.closed(roomId, "host_closed");
        return ResponseEntity.ok().build();
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> notFound(NoSuchElementException e) {
        return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
    }

    /**
     * 대국 진행: /app/omok/room/{roomId}/action
     * 처리 후 방 전체 상태를 /topic/omok/room/{roomId} 로 방송, 오류 코드는 보낸 사람에게만 전달
     */
    @MessageMapping("/omok/room/{roomId}/action")
    public void action(@DestinationVariable("roomId") String roomId,
                       @Payload OmokDTO.Action action,
                       Principal principal) {
        if (principal == null || action.getType() == null) return;
        String nick = principal.getName();
        try {
            OmokRoom room = roomService.getRoom(roomId);
            switch (action.getType()) {
                case START -> room.start(nick);
                case MOVE -> room.move(nick, action.getCell());
                case RESIGN -> room.resign(nick);
                case UNDO_REQUEST -> room.requestUndo(nick);
                case UNDO_ACCEPT -> room.answerUndo(nick, true);
                case UNDO_DECLINE -> room.answerUndo(nick, false);
                case REMATCH -> room.rematch(nick);
                case LEAVE -> {
                    if (room.leave(nick)) {
                        roomService.removeRoom(roomId);
                        roomService.closed(roomId, "host_left");
                        return;
                    }
                }
                case CHAT -> {
                    String text = action.getText() == null ? "" : action.getText().strip();
                    if (text.isEmpty()) return;
                    messagingTemplate.convertAndSend("/topic/omok/room/" + roomId,
                            OmokDTO.Event.builder().type(OmokDTO.Event.Type.CHAT)
                                    .sender(nick).text(text.substring(0, Math.min(text.length(), 200))).build());
                    return;
                }
            }
            roomService.broadcast(room);
        } catch (RuntimeException e) {
            messagingTemplate.convertAndSendToUser(nick, "/queue/omok",
                    OmokDTO.Event.builder().type(OmokDTO.Event.Type.ERROR).text(e.getMessage()).build());
        }
    }
}
