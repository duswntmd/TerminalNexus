package kr.pe.tn.api;

import kr.pe.tn.domain.janggi.dto.JanggiDTO;
import kr.pe.tn.domain.janggi.entity.JanggiRoom;
import kr.pe.tn.domain.janggi.service.JanggiRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 실시간 장기 온라인 컨트롤러 (REST API & STOMP WebSocket)
 */
@RestController
@RequiredArgsConstructor
public class JanggiGameController {

    private final JanggiRoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 모든 대국 방 목록 조회
     */
    @GetMapping("/api/janggi/rooms")
    public ResponseEntity<List<JanggiDTO.RoomResponse>> getRooms() {
        return ResponseEntity.ok(roomService.getAllRooms());
    }

    /**
     * 특정 대국 방 조회
     */
    @GetMapping("/api/janggi/room/{roomId}")
    public ResponseEntity<JanggiDTO.RoomResponse> getRoom(@PathVariable("roomId") String roomId) {
        JanggiRoom room = roomService.getRoom(roomId);
        if (room == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(JanggiDTO.RoomResponse.builder()
                .roomId(room.getRoomId())
                .title(room.getTitle())
                .hostNickname(room.getHostNickname())
                .guestNickname(room.getGuestNickname())
                .choNickname(room.getChoNickname())
                .hanNickname(room.getHanNickname())
                .choFormation(room.getChoFormation())
                .hanFormation(room.getHanFormation())
                .status(room.getStatus())
                .currentTurn(room.getCurrentTurn())
                .userCount(room.getUserCount())
                .build());
    }

    /**
     * 신규 대국 방 생성
     */
    @PostMapping("/api/janggi/room")
    public ResponseEntity<JanggiDTO.RoomResponse> createRoom(@RequestBody JanggiDTO.CreateRoomRequest req) {
        return ResponseEntity.ok(roomService.createRoom(req));
    }

    /**
     * 대국 방 삭제 (방장 전용)
     */
    @DeleteMapping("/api/janggi/room/{roomId}")
    public ResponseEntity<Void> deleteRoom(@PathVariable("roomId") String roomId, @RequestParam("hostNickname") String hostNickname) {
        boolean deleted = roomService.deleteRoom(roomId, hostNickname);
        if (deleted) {
            messagingTemplate.convertAndSend("/topic/janggi/room/" + roomId, JanggiDTO.GameMessage.builder()
                    .type(JanggiDTO.GameMessage.MessageType.LEAVE)
                    .roomId(roomId)
                    .text("방장에 의해 방이 삭제되었습니다.")
                    .build());
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.badRequest().build();
    }

    /**
     * STOMP 메시지 브로드캐스터
     * 클라이언트 전송: /app/janggi/room/{roomId}/action
     * 브로커 구독: /topic/janggi/room/{roomId}
     */
    @MessageMapping("/janggi/room/{roomId}/action")
    public void processGameAction(@DestinationVariable("roomId") String roomId, @Payload JanggiDTO.GameMessage message) {
        if (message.getType() == JanggiDTO.GameMessage.MessageType.LEAVE) {
            boolean roomDeleted = roomService.leaveRoom(roomId, message.getSender());
            if (roomDeleted) {
                message.setText("방장이 퇴장하여 방이 해산되었습니다.");
            } else {
                message.setText(message.getSender() + " 님이 방을 나갔습니다.");
            }
            messagingTemplate.convertAndSend("/topic/janggi/room/" + roomId, message);
            return;
        }

        JanggiRoom updatedRoom = roomService.updateRoomState(roomId, message);

        if (updatedRoom != null) {
            message.setChoFormation(updatedRoom.getChoFormation());
            message.setHanFormation(updatedRoom.getHanFormation());
            message.setCurrentTurn(updatedRoom.getCurrentTurn());
            message.setStatus(updatedRoom.getStatus());
        }

        // 해당 방 구독자들에게 실시간 브로드캐스트
        messagingTemplate.convertAndSend("/topic/janggi/room/" + roomId, message);
    }
}
