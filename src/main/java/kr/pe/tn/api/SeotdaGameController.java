package kr.pe.tn.api;

import kr.pe.tn.domain.seotda.dto.SeotdaDTO;
import kr.pe.tn.domain.seotda.entity.SeotdaRoom;
import kr.pe.tn.domain.seotda.service.SeotdaRoomService;
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
 * 실시간 온라인 섯다 (REST: 로비/입장, STOMP: 판 진행). 체스(ChessGameController)와 같은 방식.
 *
 * 참가자 확인은 로그인 정보로만 한다.
 * - REST: principal = username → 닉네임 조회
 * - STOMP: principal = 닉네임 (WebSocketConfig 의 CONNECT 인증)
 * 패는 서버가 섞어 나눠 주고, 베팅은 서버 규칙(SeotdaHand)으로 검증한다. 금액은 서버가 계산한다.
 */
@RestController
@RequiredArgsConstructor
public class SeotdaGameController {

    private final SeotdaRoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    private String nicknameOf(Principal principal) {
        return userRepository.findByUsernameAndIsLock(principal.getName(), false)
                .map(UserEntity::getNickname)
                .orElseThrow(() -> new IllegalStateException("user_not_found"));
    }

    @GetMapping("/api/seotda/rooms")
    public List<SeotdaDTO.RoomSummary> getRooms() {
        return roomService.getAllRooms();
    }

    /** 방 상태 (요청한 사람이 이번 판 참가자면 자기 패 포함) */
    @GetMapping("/api/seotda/room/{roomId}")
    public SeotdaDTO.RoomState getRoom(@PathVariable("roomId") String roomId, Principal principal) {
        return roomService.getRoom(roomId).toState(nicknameOf(principal));
    }

    @PostMapping("/api/seotda/room")
    public SeotdaDTO.RoomState createRoom(@RequestBody SeotdaDTO.CreateRoomRequest req, Principal principal) {
        String nick = nicknameOf(principal);
        return roomService.createRoom(nick, req).toState(nick);
    }

    /** 입장: 빈 자리가 있고 판이 진행 중이 아니면 착석, 아니면 관전 */
    @PostMapping("/api/seotda/room/{roomId}/join")
    public SeotdaDTO.RoomState joinRoom(@PathVariable("roomId") String roomId, Principal principal) {
        String nick = nicknameOf(principal);
        SeotdaRoom room = roomService.getRoom(roomId);
        room.join(nick);
        roomService.broadcast(room);
        return room.toState(nick);
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> notFound(NoSuchElementException e) {
        return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
    }

    /**
     * 판 진행: /app/seotda/room/{roomId}/action
     * 처리 후 공개 상태를 /topic/seotda/room/{roomId} 로 방송, 오류 코드는 보낸 사람에게만 전달
     */
    @MessageMapping("/seotda/room/{roomId}/action")
    public void action(@DestinationVariable("roomId") String roomId,
                       @Payload SeotdaDTO.Action action,
                       Principal principal) {
        if (principal == null || action.getType() == null) return;
        String nick = principal.getName();
        try {
            SeotdaRoom room = roomService.getRoom(roomId);
            switch (action.getType()) {
                case START -> {
                    room.start(nick);
                    roomService.sendHands(room);
                }
                case BET -> room.bet(nick, action.getBet());
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
                    messagingTemplate.convertAndSend("/topic/seotda/room/" + roomId,
                            SeotdaDTO.Event.builder().type(SeotdaDTO.Event.Type.CHAT)
                                    .sender(nick).text(text.substring(0, Math.min(text.length(), 200))).build());
                    return;
                }
            }
            roomService.broadcast(room);
        } catch (RuntimeException e) {
            messagingTemplate.convertAndSendToUser(nick, "/queue/seotda",
                    SeotdaDTO.Event.builder().type(SeotdaDTO.Event.Type.ERROR).text(e.getMessage()).build());
        }
    }
}
