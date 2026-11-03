package kr.pe.tn.domain.chess.service;

import kr.pe.tn.domain.chess.dto.ChessDTO;
import kr.pe.tn.domain.chess.entity.ChessRoom;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 실시간 체스 방 관리 서비스
 */
@Service
public class ChessRoomService {

    private static final long IDLE_TIMEOUT_MS = 30 * 60 * 1000L; // 30분 무활동 방 정리

    private final Map<String, ChessRoom> roomMap = new ConcurrentHashMap<>();

    public List<ChessDTO.RoomSummary> getAllRooms() {
        return roomMap.values().stream()
                .sorted(Comparator.comparingLong(ChessRoom::getLastActivity).reversed())
                .map(ChessRoom::toSummary)
                .toList();
    }

    public ChessRoom getRoom(String roomId) {
        ChessRoom room = roomMap.get(roomId);
        if (room == null) throw new NoSuchElementException("room_not_found");
        return room;
    }

    public ChessRoom createRoom(String hostNick, ChessDTO.CreateRoomRequest req) {
        // 한 사람이 대기방을 여러 개 만들지 않도록 기존 대기방 정리
        roomMap.values().removeIf(r -> r.getHost().equals(hostNick) && r.getStatus() == ChessRoom.Status.WAITING);

        String title = req.getTitle() != null && !req.getTitle().isBlank()
                ? req.getTitle().strip().substring(0, Math.min(req.getTitle().strip().length(), 40))
                : hostNick;
        ChessRoom room = new ChessRoom(title, hostNick, req.getSide());
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
