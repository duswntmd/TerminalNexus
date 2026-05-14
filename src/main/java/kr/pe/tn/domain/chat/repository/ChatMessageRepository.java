package kr.pe.tn.domain.chat.repository;

import kr.pe.tn.domain.chat.entity.ChatMessageEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 채팅 메시지 레포지토리
 *
 * - findTop100ByRoomIdOrderByCreatedAtDesc: 최신 100건 역순 조회 후 프론트엔드에서 reverse()
 * - 인덱스 (room_id, created_at DESC) 사용으로 풀스캔 방지
 */
public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, Long> {

    /**
     * 채팅방별 최신 메시지 N건 조회 (최신순 → 프론트에서 역정렬)
     *
     * @param roomId   채팅방 ID
     * @param pageable 페이지 크기 (100건)
     * @return 최신 메시지 목록 (최신순)
     */
    @Query("SELECT m FROM ChatMessageEntity m WHERE m.roomId = :roomId ORDER BY m.createdAt DESC")
    List<ChatMessageEntity> findRecentMessages(@Param("roomId") String roomId, Pageable pageable);
}
