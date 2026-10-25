package kr.pe.tn.domain.stock.repository;

import kr.pe.tn.domain.stock.entity.StockCandleEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StockCandleRepository extends JpaRepository<StockCandleEntity, Long> {

    /** 최근 봉 (최신순) */
    @Query("SELECT c FROM StockCandleEntity c WHERE c.ticker = :ticker AND c.interval = :interval ORDER BY c.startTime DESC")
    List<StockCandleEntity> findRecent(@Param("ticker") String ticker,
                                       @Param("interval") StockCandleEntity.Interval interval,
                                       Pageable pageable);

    /** 오래된 봉 정리 */
    @Modifying
    @Query("DELETE FROM StockCandleEntity c WHERE c.interval = :interval AND c.startTime < :before")
    int deleteOlderThan(@Param("interval") StockCandleEntity.Interval interval, @Param("before") long before);
}
