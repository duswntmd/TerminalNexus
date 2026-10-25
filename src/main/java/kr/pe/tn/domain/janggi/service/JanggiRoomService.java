package kr.pe.tn.domain.janggi.service;

import kr.pe.tn.domain.janggi.dto.JanggiDTO;
import kr.pe.tn.domain.janggi.entity.JanggiRoom;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 실시간 장기 방 관리 서비스
 */
@Service
public class JanggiRoomService {

    private static final long IDLE_TIMEOUT_MS = 30 * 60 * 1000L; // 30분 무활동 방 정리

    private final Map<String, JanggiRoom> roomMap = new ConcurrentHashMap<>();

    public List<JanggiDTO.RoomSummary> getAllRooms() {
        return roomMap.values().stream()
                .sorted(Comparator.comparingLong(JanggiRoom::getLastActivity).reversed())
                .map(JanggiRoom::toSummary)
                .toList();
    }

    public JanggiRoom getRoom(String roomId) {
        JanggiRoom room = roomMap.get(roomId);
        if (room == null) throw new NoSuchElementException("방을 찾을 수 없습니다.");
        return room;
    }

    public JanggiRoom createRoom(String hostNick, JanggiDTO.CreateRoomRequest req) {
        // 한 사람이 대기방을 여러 개 만들지 않도록 기존 대기방 정리
        roomMap.values().removeIf(r -> r.getHost().equals(hostNick) && r.getStatus() == JanggiRoom.Status.WAITING);

        String title = req.getTitle() != null && !req.getTitle().isBlank()
                ? req.getTitle().strip().substring(0, Math.min(req.getTitle().strip().length(), 40))
                : hostNick + "님의 대국";
        JanggiRoom room = new JanggiRoom(title, hostNick, req.getSide(), req.getFormation());
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
