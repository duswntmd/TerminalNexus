package kr.pe.tn.domain.janggi.service;

import kr.pe.tn.domain.janggi.dto.JanggiDTO;
import kr.pe.tn.domain.janggi.entity.JanggiRoom;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 실시간 장기 방 관리 서비스
 */
@Service
public class JanggiRoomService {

    private final Map<String, JanggiRoom> roomMap = new ConcurrentHashMap<>();

    /**
     * 모든 대국 방 목록 조회
     */
    public List<JanggiDTO.RoomResponse> getAllRooms() {
        List<JanggiDTO.RoomResponse> result = new ArrayList<>();
        for (JanggiRoom room : roomMap.values()) {
            result.add(convertToResponse(room));
        }
        return result;
    }

    /**
     * 특정 대국 방 조회
     */
    public JanggiRoom getRoom(String roomId) {
        return roomMap.get(roomId);
    }

    /**
     * 신규 대국 방 생성
     */
    public JanggiDTO.RoomResponse createRoom(JanggiDTO.CreateRoomRequest req) {
        JanggiRoom room = JanggiRoom.create(
                req.getTitle() != null && !req.getTitle().isBlank() ? req.getTitle() : "장기 한 판 부르실 분!",
                req.getHostNickname() != null ? req.getHostNickname() : "초보기사",
                req.getPreferredTeam(),
                req.getFormation() != null ? req.getFormation() : "N_E_N_E"
        );
        roomMap.put(room.getRoomId(), room);
        return convertToResponse(room);
    }

    /**
     * 대국 방 참가
     */
    public JanggiDTO.RoomResponse joinRoom(String roomId, String guestNickname) {
        JanggiRoom room = roomMap.get(roomId);
        if (room == null) return null;

        if (room.getUserCount() < 2 && !guestNickname.equals(room.getHostNickname())) {
            room.joinGuest(guestNickname);
        }
        return convertToResponse(room);
    }

    /**
     * 대국 상태 업데이트 (상차림/시작/턴변경/종료)
     */
    public JanggiRoom updateRoomState(String roomId, JanggiDTO.GameMessage msg) {
        JanggiRoom room = roomMap.get(roomId);
        if (room == null) return null;

        if (msg.getChoFormation() != null) {
            room.setChoFormation(msg.getChoFormation());
        }
        if (msg.getHanFormation() != null) {
            room.setHanFormation(msg.getHanFormation());
        }

        if (msg.getType() == JanggiDTO.GameMessage.MessageType.READY || msg.getType() == JanggiDTO.GameMessage.MessageType.START) {
            room.setStatus("PLAYING");
        } else if (msg.getType() == JanggiDTO.GameMessage.MessageType.MOVE || msg.getType() == JanggiDTO.GameMessage.MessageType.PASS) {
            room.setCurrentTurn("CHO".equals(room.getCurrentTurn()) ? "HAN" : "CHO");
        } else if (msg.getType() == JanggiDTO.GameMessage.MessageType.RESIGN) {
            room.setStatus("CHO".equals(msg.getTeam()) ? "HAN_WIN" : "CHO_WIN");
        } else if (msg.getType() == JanggiDTO.GameMessage.MessageType.RESTART) {
            room.setStatus("PLAYING");
            room.setCurrentTurn("CHO");
        }

        return room;
    }

    /**
     * 대국 방 퇴장 처리
     */
    public boolean leaveRoom(String roomId, String nickname) {
        JanggiRoom room = roomMap.get(roomId);
        if (room == null) return false;

        // 방장이 나가면 방 자체 삭제
        if (nickname.equals(room.getHostNickname())) {
            roomMap.remove(roomId);
            return true;
        }

        // 게스트가 나가면 인원 수 감소 및 대기 상태 복구
        if (nickname.equals(room.getGuestNickname())) {
            room.setGuestNickname(null);
            if (nickname.equals(room.getChoNickname())) room.setChoNickname(null);
            if (nickname.equals(room.getHanNickname())) room.setHanNickname(null);
            room.setUserCount(1);
            room.setStatus("WAITING");
        }
        return false;
    }

    /**
     * 대국 방 삭제 (방장 전용)
     */
    public boolean deleteRoom(String roomId, String hostNickname) {
        JanggiRoom room = roomMap.get(roomId);
        if (room != null && room.getHostNickname().equals(hostNickname)) {
            roomMap.remove(roomId);
            return true;
        }
        return false;
    }

    /**
     * 대국 방 삭제
     */
    public void removeRoom(String roomId) {
        roomMap.remove(roomId);
    }

    private JanggiDTO.RoomResponse convertToResponse(JanggiRoom room) {
        return JanggiDTO.RoomResponse.builder()
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
                .build();
    }
}
