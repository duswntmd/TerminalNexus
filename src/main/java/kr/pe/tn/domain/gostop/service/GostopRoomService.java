package kr.pe.tn.domain.gostop.service;

import kr.pe.tn.domain.gostop.dto.GostopDTO;
import kr.pe.tn.domain.gostop.entity.GostopRoom;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 온라인 맞고 방 관리 (체스 ChessRoomService와 같은 방식)
 */
@Service
public class GostopRoomService {

    private static final long IDLE_TIMEOUT_MS = 30 * 60 * 1000L;

    private final Map<String, GostopRoom> roomMap = new ConcurrentHashMap<>();

    public List<GostopDTO.RoomSummary> getAllRooms() {
        return roomMap.values().stream()
                .sorted(Comparator.comparingLong(GostopRoom::getLastActivity).reversed())
                .map(GostopRoom::toSummary)
                .toList();
    }

    public GostopRoom getRoom(String roomId) {
        GostopRoom room = roomMap.get(roomId);
        if (room == null) throw new NoSuchElementException("room_not_found");
        return room;
    }

    public GostopRoom createRoom(String hostNick, GostopDTO.CreateRoomRequest req) {
        roomMap.values().removeIf(r -> r.getHost().equals(hostNick) && r.getStatus() == GostopRoom.Status.WAITING);
        String raw = req.getTitle() == null ? "" : req.getTitle().strip();
        String title = raw.isEmpty() ? hostNick : raw.substring(0, Math.min(raw.length(), 40));
        GostopRoom room = new GostopRoom(title, hostNick);
        roomMap.put(room.getRoomId(), room);
        return room;
    }

    public void removeRoom(String roomId) {
        roomMap.remove(roomId);
    }

    @Scheduled(fixedDelay = 5 * 60 * 1000L)
    public void cleanupIdleRooms() {
        long now = System.currentTimeMillis();
        roomMap.values().removeIf(r -> now - r.getLastActivity() > IDLE_TIMEOUT_MS);
    }
}
