package kr.pe.tn.domain.chat.service;

import kr.pe.tn.domain.chat.dto.ChatMessage;
import kr.pe.tn.domain.chat.dto.ChatRoom;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 채팅 서비스
 * 채팅방 및 메시지 관리
 */
@Slf4j
@Service
public class ChatService {

    // 채팅방 저장소 (메모리 기반)
    private final Map<String, ChatRoom> chatRooms = new ConcurrentHashMap<>();

    // 사용자별 세션 정보 (username -> sessionId)
    private final Map<String, String> userSessions = new ConcurrentHashMap<>();

    public ChatService() {
        // 기본 채팅방 생성
        chatRooms.put("public", ChatRoom.createPublicRoom());
        chatRooms.put("anonymous", ChatRoom.createAnonymousRoom());
    }

    /**
     * 모든 채팅방 조회
     */
    public List<ChatRoom> getAllRooms() {
        return new ArrayList<>(chatRooms.values());
    }

    /**
     * 채팅방 조회
     */
    public ChatRoom getRoom(String roomId) {
        return chatRooms.get(roomId);
    }

    /**
     * 1:1 채팅방 생성 또는 조회
     */
    public ChatRoom getOrCreatePrivateRoom(String user1, String user2) {
        String roomId = generatePrivateRoomId(user1, user2);

        return chatRooms.computeIfAbsent(roomId, k -> {
            log.info("새로운 1:1 채팅방 생성: {} <-> {}", user1, user2);
            return ChatRoom.createPrivateRoom(user1, user2);
        });
    }

    /**
     * 사용자 입장 처리
     */
    public void addUser(String roomId, String username, String sessionId) {
        ChatRoom room = chatRooms.get(roomId);
        if (room != null) {
            room.addUser(username);
            userSessions.put(username, sessionId);
            log.info("사용자 입장: {} -> 채팅방: {} (현재 인원: {})",
                    username, room.getRoomName(), room.getUserCount());
        }
    }

    /**
     * 사용자 퇴장 처리
     */
    public void removeUser(String roomId, String username) {
        ChatRoom room = chatRooms.get(roomId);
        if (room != null) {
            room.removeUser(username);
            userSessions.remove(username);
            log.info("사용자 퇴장: {} <- 채팅방: {} (현재 인원: {})",
                    username, room.getRoomName(), room.getUserCount());
        }
    }

    /**
     * 귓속말 대상 확인
     */
    public boolean isUserOnline(String username) {
        return userSessions.containsKey(username);
    }

    /**
     * 온라인 사용자 목록 조회
     */
    public Set<String> getOnlineUsers() {
        return new HashSet<>(userSessions.keySet());
    }

    /**
     * 1:1 채팅방 ID 생성
     */
    private String generatePrivateRoomId(String user1, String user2) {
        return user1.compareTo(user2) < 0
                ? "private_" + user1 + "_" + user2
                : "private_" + user2 + "_" + user1;
    }
}
