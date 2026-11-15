package kr.pe.tn.domain.omok.service;

import kr.pe.tn.domain.omok.dto.OmokDTO;
import kr.pe.tn.domain.omok.entity.OmokRoom;
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
 * 실시간 오목 방 관리 + 방송 (차례 시간 초과를 여기서 처리하므로 방송도 함께 둔다)
 */
@Service
@RequiredArgsConstructor
public class OmokRoomService {

    private static final long IDLE_TIMEOUT_MS = 30 * 60 * 1000L; // 30분 무활동 방 정리

    private final Map<String, OmokRoom> roomMap = new ConcurrentHashMap<>();
    private final SimpMessagingTemplate messagingTemplate;

    public List<OmokDTO.RoomSummary> getAllRooms() {
        return roomMap.values().stream()
                .sorted(Comparator.comparingLong(OmokRoom::getLastActivity).reversed())
                .map(OmokRoom::toSummary)
                .toList();
    }

    public OmokRoom getRoom(String roomId) {
        OmokRoom room = roomMap.get(roomId);
        if (room == null) throw new NoSuchElementException("room_not_found");
        return room;
    }

    public OmokRoom createRoom(String hostNick, OmokDTO.CreateRoomRequest req) {
        // 한 사람이 대기방을 여러 개 만들지 않도록 기존 대기방 정리
        roomMap.values().removeIf(r -> r.getHost().equals(hostNick) && r.getStatus() == OmokRoom.Status.WAITING);
        String raw = req.getTitle() == null ? "" : req.getTitle().strip();
        String title = raw.isEmpty() ? hostNick : raw.substring(0, Math.min(raw.length(), 40));
        OmokRoom room = new OmokRoom(title, hostNick, req.getSide(), req.getRule(), req.getTurnSeconds());
        roomMap.put(room.getRoomId(), room);
        return room;
    }

    public void removeRoom(String roomId) {
        roomMap.remove(roomId);
    }

    public void broadcast(OmokRoom room) {
        messagingTemplate.convertAndSend("/topic/omok/room/" + room.getRoomId(),
                OmokDTO.Event.builder().type(OmokDTO.Event.Type.STATE).state(room.toState()).build());
    }

    public void closed(String roomId, String code) {
        messagingTemplate.convertAndSend("/topic/omok/room/" + roomId,
                OmokDTO.Event.builder().type(OmokDTO.Event.Type.CLOSED).text(code).build());
    }

    /** 제한 시간을 넘긴 차례는 시간패 */
    @Scheduled(fixedDelay = 1000L)
    public void expireTurns() {
        long now = System.currentTimeMillis();
        for (OmokRoom room : roomMap.values()) {
            if (room.expireTurn(now)) broadcast(room);
        }
    }

    @Scheduled(fixedDelay = 5 * 60 * 1000L)
    public void cleanupIdleRooms() {
        long now = System.currentTimeMillis();
        roomMap.values().removeIf(r -> now - r.getLastActivity() > IDLE_TIMEOUT_MS);
    }
}
