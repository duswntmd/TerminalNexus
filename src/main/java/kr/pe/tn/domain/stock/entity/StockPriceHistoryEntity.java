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

    public Long getId() { return id; }
    public String getTicker() { return ticker; }
    public Long getPrice() { return price; }
    public LocalDateTime getRecordedAt() { return recordedAt; }

    public static StockPriceHistoryEntityBuilder builder() { return new StockPriceHistoryEntityBuilder(); }

    public static class StockPriceHistoryEntityBuilder {
        private String ticker;
        private Long price;

        public StockPriceHistoryEntityBuilder ticker(String ticker) { this.ticker = ticker; return this; }
        public StockPriceHistoryEntityBuilder price(Long price) { this.price = price; return this; }

        public StockPriceHistoryEntity build() {
            StockPriceHistoryEntity h = new StockPriceHistoryEntity();
            h.ticker = this.ticker;
            h.price = this.price;
            return h;
        }
    }
}
