package kr.pe.tn.api;

import kr.pe.tn.domain.gostop.dto.GostopDTO;
import kr.pe.tn.domain.gostop.engine.GostopGame;
import kr.pe.tn.domain.gostop.entity.GostopRoom;
import kr.pe.tn.domain.gostop.service.GostopRoomService;
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
 * 온라인 맞고 (REST: 로비/입장, STOMP: 대국 진행). 체스·장기와 같은 방식.
 *
 * 패가 새지 않도록 방 전체 방송(topic)에는 채팅과 방 닫힘만 보내고,
 * 판 상태는 대국자마다 자기 시점으로 가린 상태를 /user/queue/gostop 으로 따로 보낸다.
 * - REST: principal = username → 닉네임 조회
 * - STOMP: principal = 닉네임
 */
@RestController
@RequiredArgsConstructor
public class GostopGameController {

    private final GostopRoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    private String nicknameOf(Principal principal) {
        return userRepository.findByUsernameAndIsLock(principal.getName(), false)
                .map(UserEntity::getNickname)
                .orElseThrow(() -> new IllegalStateException("user_not_found"));
    }

    /** 대국자 각자에게 자기 시점 상태 전송 */
    private void sendStates(GostopRoom room) {
        for (String nick : room.playerList()) {
            messagingTemplate.convertAndSendToUser(nick, "/queue/gostop",
                    GostopDTO.Event.builder().type(GostopDTO.Event.Type.STATE).roomId(room.getRoomId()).state(room.toState(nick)).build());
        }
    }

    private void closed(String roomId, String code) {
        messagingTemplate.convertAndSend("/topic/gostop/room/" + roomId,
                GostopDTO.Event.builder().type(GostopDTO.Event.Type.CLOSED).roomId(roomId).text(code).build());
    }

    @GetMapping("/api/gostop/rooms")
    public List<GostopDTO.RoomSummary> getRooms() {
        return roomService.getAllRooms();
    }

    @GetMapping("/api/gostop/room/{roomId}")
    public GostopDTO.RoomState getRoom(@PathVariable("roomId") String roomId, Principal principal) {
        return roomService.getRoom(roomId).toState(nicknameOf(principal));
    }

    @PostMapping("/api/gostop/room")
    public GostopDTO.RoomState createRoom(@RequestBody GostopDTO.CreateRoomRequest req, Principal principal) {
        String nick = nicknameOf(principal);
        return roomService.createRoom(nick, req).toState(nick);
    }

    /** 입장: 빈자리가 있으면 착석 (관전 없음) */
    @PostMapping("/api/gostop/room/{roomId}/join")
    public GostopDTO.RoomState joinRoom(@PathVariable("roomId") String roomId, Principal principal) {
        String nick = nicknameOf(principal);
        GostopRoom room = roomService.getRoom(roomId);
        room.join(nick);
        sendStates(room);
        return room.toState(nick);
    }

    @DeleteMapping("/api/gostop/room/{roomId}")
    public ResponseEntity<Void> deleteRoom(@PathVariable("roomId") String roomId, Principal principal) {
        GostopRoom room = roomService.getRoom(roomId);
        if (!room.getHost().equals(nicknameOf(principal))) return ResponseEntity.status(403).build();
        roomService.removeRoom(roomId);
        closed(roomId, "host_closed");
        return ResponseEntity.ok().build();
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> notFound(NoSuchElementException e) {
        return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> badState(IllegalStateException e) {
        return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
    }

    /** 대국 진행: /app/gostop/room/{roomId}/action */
    @MessageMapping("/gostop/room/{roomId}/action")
    public void action(@DestinationVariable("roomId") String roomId,
                       @Payload GostopDTO.Action action,
                       Principal principal) {
        if (principal == null || action.getType() == null) return;
        String nick = principal.getName();
        try {
            GostopRoom room = roomService.getRoom(roomId);
            switch (action.getType()) {
                case START -> room.start(nick);
                case ACT -> room.act(nick, new GostopGame.Action(action.getAct(), action.getCard(),
                        action.getShake(), action.getMonth(), action.getValue()));
                case LEAVE -> {
                    if (room.leave(nick)) {
                        roomService.removeRoom(roomId);
                        closed(roomId, "host_left");
                        return;
                    }
                }
                case CHAT -> {
                    if (room.seatOf(nick) < 0) return;
                    String text = action.getText() == null ? "" : action.getText().strip();
                    if (text.isEmpty()) return;
                    messagingTemplate.convertAndSend("/topic/gostop/room/" + roomId,
                            GostopDTO.Event.builder().type(GostopDTO.Event.Type.CHAT).roomId(roomId)
                                    .sender(nick).text(text.substring(0, Math.min(text.length(), 200))).build());
                    return;
                }
            }
            sendStates(room);
        } catch (RuntimeException e) {
            messagingTemplate.convertAndSendToUser(nick, "/queue/gostop",
                    GostopDTO.Event.builder().type(GostopDTO.Event.Type.ERROR).roomId(roomId).text(e.getMessage()).build());
        }
    }
}
