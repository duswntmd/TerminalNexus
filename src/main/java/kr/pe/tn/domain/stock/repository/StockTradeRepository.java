package kr.pe.tn.domain.stock.repository;

import kr.pe.tn.domain.stock.entity.StockTradeEntity;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockTradeRepository extends JpaRepository<StockTradeEntity, Long> {

    /** 최근 거래 내역 최대 20건 */
    List<StockTradeEntity> findTop20ByUserOrderByTradedAtDesc(UserEntity user);
}
