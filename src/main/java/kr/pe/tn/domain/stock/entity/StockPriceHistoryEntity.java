package kr.pe.tn.domain.stock.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 종목별 가격 히스토리 (차트 표시용, 최근 50개 유지)
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "stock_price_history", indexes = {
        @Index(name = "idx_history_ticker_time", columnList = "ticker, recorded_at")
})
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockPriceHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticker", nullable = false, length = 10)
    private String ticker;

    @Column(name = "price", nullable = false)
    private Long price;

    @CreatedDate
    @Column(name = "recorded_at", updatable = false)
    private LocalDateTime recordedAt;
}
