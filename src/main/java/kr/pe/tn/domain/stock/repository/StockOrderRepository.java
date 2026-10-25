package kr.pe.tn.domain.stock.repository;

import jakarta.persistence.LockModeType;
import kr.pe.tn.domain.stock.entity.StockOrderEntity;
import kr.pe.tn.domain.stock.entity.StockTradeEntity;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StockOrderRepository extends JpaRepository<StockOrderEntity, Long> {

    /** 유저별 미체결 주문 목록 */
    List<StockOrderEntity> findByUserAndOrderStatusOrderByCreatedAtDesc(UserEntity user, StockOrderEntity.OrderStatus status);

    /** 전체 미체결 주문 (개편 시 정리용) */
    List<StockOrderEntity> findByOrderStatus(StockOrderEntity.OrderStatus status);

    /** 종목별 미체결 주문 (자동 체결용, 먼저 들어온 주문부터) */
    List<StockOrderEntity> findByTickerAndOrderStatusOrderByCreatedAtAsc(String ticker, StockOrderEntity.OrderStatus status);

    /** 매도 주문에 묶인 수량 (매도가능수량 계산) */
    @Query("SELECT COALESCE(SUM(o.quantity), 0) FROM StockOrderEntity o WHERE o.user = :user AND o.ticker = :ticker "
            + "AND o.tradeType = :type AND o.orderStatus = kr.pe.tn.domain.stock.entity.StockOrderEntity.OrderStatus.PENDING")
    long sumPendingQuantity(@Param("user") UserEntity user, @Param("ticker") String ticker,
                            @Param("type") StockTradeEntity.TradeType type);

    /** 매수 주문에 묶인 금액 (총자산 계산) */
    @Query("SELECT COALESCE(SUM(o.reservedCash), 0) FROM StockOrderEntity o WHERE o.user = :user "
            + "AND o.orderStatus = kr.pe.tn.domain.stock.entity.StockOrderEntity.OrderStatus.PENDING "
            + "AND o.tradeType = kr.pe.tn.domain.stock.entity.StockTradeEntity.TradeType.BUY")
    long sumReservedCash(@Param("user") UserEntity user);

    /** 종목·가격별 미체결 잔량 (호가창에 실제 주문 반영) */
    @Query("SELECT o.tradeType, o.targetPrice, SUM(o.quantity) FROM StockOrderEntity o WHERE o.ticker = :ticker "
            + "AND o.orderStatus = kr.pe.tn.domain.stock.entity.StockOrderEntity.OrderStatus.PENDING "
            + "GROUP BY o.tradeType, o.targetPrice")
    List<Object[]> sumPendingByPrice(@Param("ticker") String ticker);

    /** 취소·자동 체결이 같은 주문을 동시에 처리하지 않도록 쓰기 잠금 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM StockOrderEntity o WHERE o.id = :id")
    Optional<StockOrderEntity> findByIdForUpdate(@Param("id") Long id);
}
