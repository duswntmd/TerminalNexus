package kr.pe.tn.domain.stock.repository;

import kr.pe.tn.domain.stock.entity.StockPriceHistoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StockPriceHistoryRepository extends JpaRepository<StockPriceHistoryEntity, Long> {

    /** 특정 종목의 최근 N개 히스토리 조회 (오래된 순) */
    @Query("SELECT h FROM StockPriceHistoryEntity h WHERE h.ticker = :ticker ORDER BY h.recordedAt ASC")
    List<StockPriceHistoryEntity> findByTickerOrderByRecordedAtAsc(@Param("ticker") String ticker);

    /** 특정 종목의 히스토리 개수 */
    long countByTicker(String ticker);

    /** 가장 오래된 히스토리 삭제 (50개 초과 분) */
    @Modifying
    @Query(value = """
        DELETE FROM stock_price_history
        WHERE ticker = :ticker
        AND id NOT IN (
            SELECT id FROM (
                SELECT id FROM stock_price_history
                WHERE ticker = :ticker
                ORDER BY recorded_at DESC
                LIMIT 50
            ) AS latest
        )
        """, nativeQuery = true)
    void deleteOldHistories(@Param("ticker") String ticker);
}
