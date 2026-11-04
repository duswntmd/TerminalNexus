package kr.pe.tn.domain.seotda.service;

import kr.pe.tn.domain.seotda.dto.SeotdaDTO;
import kr.pe.tn.domain.seotda.entity.SeotdaRoom;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 실시간 섯다 방 관리 + 방송 (차례 시간 초과는 여기서 처리하므로 방송도 함께 둔다)
 */
@Service
@RequiredArgsConstructor
public class SeotdaRoomService {

    private static final long IDLE_TIMEOUT_MS = 30 * 60 * 1000L; // 30분 무활동 방 정리

    private final Map<String, SeotdaRoom> roomMap = new ConcurrentHashMap<>();
    private final SimpMessagingTemplate messagingTemplate;

    public List<SeotdaDTO.RoomSummary> getAllRooms() {
        return roomMap.values().stream()
                .sorted(Comparator.comparingLong(SeotdaRoom::getLastActivity).reversed())
                .map(SeotdaRoom::toSummary)
                .toList();
    }

    public SeotdaRoom getRoom(String roomId) {
        SeotdaRoom room = roomMap.get(roomId);
        if (room == null) throw new NoSuchElementException("room_not_found");
        return room;
    }

    public SeotdaRoom createRoom(String hostNick, SeotdaDTO.CreateRoomRequest req) {
        // 한 사람이 대기방을 여러 개 만들지 않도록 기존 대기방 정리
        roomMap.values().removeIf(r -> r.getHost().equals(hostNick) && r.getStatus() != SeotdaRoom.Status.PLAYING);
        String raw = req.getTitle() == null ? "" : req.getTitle().strip();
        String title = raw.isEmpty() ? hostNick : raw.substring(0, Math.min(raw.length(), 40));
        SeotdaRoom room = new SeotdaRoom(title, hostNick);
        roomMap.put(room.getRoomId(), room);
        return room;
    }

    public void removeRoom(String roomId) {
        roomMap.remove(roomId);
    }

    /** 공개 상태는 방 전체에, 새 판의 패는 각자에게만 보낸다 */
    public void broadcast(SeotdaRoom room) {
        messagingTemplate.convertAndSend("/topic/seotda/room/" + room.getRoomId(),
                SeotdaDTO.Event.builder().type(SeotdaDTO.Event.Type.STATE).state(room.toState(null)).build());
    }

    public void sendHands(SeotdaRoom room) {
        for (String nick : room.handPlayers()) {
            messagingTemplate.convertAndSendToUser(nick, "/queue/seotda",
                    SeotdaDTO.Event.builder().type(SeotdaDTO.Event.Type.HAND)
                            .handNo(room.getHandNo()).cards(room.cardsOf(nick)).text(room.getRoomId()).build());
        }
    }

    public void closed(String roomId, String code) {
        messagingTemplate.convertAndSend("/topic/seotda/room/" + roomId,
                SeotdaDTO.Event.builder().type(SeotdaDTO.Event.Type.CLOSED).text(code).build());
    }

    @Scheduled(fixedDelay = 3000L)
    public void expireTurns() {
        long now = System.currentTimeMillis();
        for (SeotdaRoom room : roomMap.values()) {
            if (room.expireTurn(now)) broadcast(room);
        }
    }

    @Scheduled(fixedDelay = 5 * 60 * 1000L)
    public void cleanupIdleRooms() {
        long now = System.currentTimeMillis();
        roomMap.values().removeIf(r -> now - r.getLastActivity() > IDLE_TIMEOUT_MS);
    }
}
