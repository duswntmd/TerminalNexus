package kr.pe.tn.domain.stock.repository;

import kr.pe.tn.domain.stock.entity.StockOrderEntity;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockOrderRepository extends JpaRepository<StockOrderEntity, Long> {

    /** 유저별 미체결 주문 목록 */
    List<StockOrderEntity> findByUserAndOrderStatusOrderByCreatedAtDesc(UserEntity user, StockOrderEntity.OrderStatus status);

    /** 특정 종목의 모든 미체결 주문 목록 (체결 시뮬레이션용) */
    List<StockOrderEntity> findByOrderStatus(StockOrderEntity.OrderStatus status);
}
