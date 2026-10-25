package kr.pe.tn.domain.stock.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 봉 데이터 (분봉 M1 / 일봉 D1, D1 은 1시간 = 1거래일)
 * startTime: 봉 시작 시각 (epoch 초)
 */
@Entity
@Table(name = "stock_candle", indexes = {
        @Index(name = "idx_candle_ticker_interval_time", columnList = "ticker, candle_interval, start_time")
})
@Getter
@NoArgsConstructor
public class StockCandleEntity {

    public enum Interval { M1, D1 }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticker", nullable = false, length = 10)
    private String ticker;

    @Enumerated(EnumType.STRING)
    @Column(name = "candle_interval", nullable = false, length = 4)
    private Interval interval;

    @Column(name = "start_time", nullable = false)
    private Long startTime;

    @Column(name = "open_price", nullable = false)
    private Long open;

    @Column(name = "high_price", nullable = false)
    private Long high;

    @Column(name = "low_price", nullable = false)
    private Long low;

    @Column(name = "close_price", nullable = false)
    private Long close;

    @Column(name = "volume", nullable = false)
    private Long volume;

    public StockCandleEntity(String ticker, Interval interval, long startTime, long open, long high, long low, long close, long volume) {
        this.ticker = ticker;
        this.interval = interval;
        this.startTime = startTime;
        this.open = open;
        this.high = high;
        this.low = low;
        this.close = close;
        this.volume = volume;
    }
}
