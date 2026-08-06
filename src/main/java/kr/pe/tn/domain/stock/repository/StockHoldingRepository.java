package kr.pe.tn.domain.stock.repository;

import kr.pe.tn.domain.stock.entity.StockHoldingEntity;
import kr.pe.tn.domain.stock.entity.StockOrderEntity;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface StockHoldingRepository extends JpaRepository<StockHoldingEntity, Long> {

    List<StockHoldingEntity> findByUser(UserEntity user);

    Optional<StockHoldingEntity> findByUserAndTickerAndPositionTypeAndLeverage(
            UserEntity user, String ticker, StockOrderEntity.PositionType positionType, Integer leverage);

    /** 랭킹: 유저별 총 투자금 합산 */
    @Query("SELECT h.user.id, h.user.nickname, SUM(h.avgPrice * h.quantity) FROM StockHoldingEntity h GROUP BY h.user.id, h.user.nickname")
    List<Object[]> findUserTotalInvestment();
}
