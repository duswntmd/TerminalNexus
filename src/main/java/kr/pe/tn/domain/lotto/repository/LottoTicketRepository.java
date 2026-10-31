package kr.pe.tn.domain.lotto.repository;

import kr.pe.tn.domain.lotto.entity.LottoTicketEntity;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface LottoTicketRepository extends JpaRepository<LottoTicketEntity, Long> {
    List<LottoTicketEntity> findByUserOrderByCreatedAtDesc(UserEntity user);

    long countByUser(UserEntity user);

    boolean existsByUserAndNumbers(UserEntity user, String numbers);

    Optional<LottoTicketEntity> findByIdAndUser(Long id, UserEntity user);

    /** 알림 생성용: 사용자까지 한 번에 조회 */
    @Query("SELECT t FROM LottoTicketEntity t JOIN FETCH t.user")
    List<LottoTicketEntity> findAllWithUser();
}
