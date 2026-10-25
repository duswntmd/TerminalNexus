package kr.pe.tn.domain.stock.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 가상 종목
 * - previousClose: 기준가(직전 거래일 종가), 상·하한가 계산 기준
 * - day*: 당일(현재 거래일) 시가·고가·저가·거래량·거래대금
 * - fairValue: 시세가 천천히 회귀하는 적정가 (뉴스로 이동)
 */
@Entity
@Table(name = "stock_item")
@Getter
@NoArgsConstructor
public class StockEntity {

    @Id
    @Column(name = "ticker", length = 10)
    private String ticker;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "current_price", nullable = false)
    private Long currentPrice;

    @Column(name = "previous_close", nullable = false)
    private Long previousClose;

    @Column(name = "volatility", nullable = false)
    private Double volatility;

    @Column(name = "market_cap")
    private Long marketCap; // 최초 시가총액 (상장주식수 계산용)

    @Column(name = "per")
    private Double per;

    @Column(name = "pbr")
    private Double pbr;

    @Column(name = "theme", length = 50)
    private String theme;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "shares")
    private Long shares; // 상장주식수

    @Column(name = "fair_value")
    private Double fairValue;

    @Column(name = "day_open")
    private Long dayOpen;

    @Column(name = "day_high")
    private Long dayHigh;

    @Column(name = "day_low")
    private Long dayLow;

    @Column(name = "day_volume")
    private Long dayVolume;

    @Column(name = "day_amount")
    private Long dayAmount; // 거래대금

    public static StockEntity create(String ticker, String name, long price, double volatility, long marketCap,
                                     double per, double pbr, String theme, String description) {
        StockEntity s = new StockEntity();
        s.ticker = ticker;
        s.name = name;
        s.currentPrice = price;
        s.previousClose = price;
        s.volatility = volatility;
        s.marketCap = marketCap;
        s.per = per;
        s.pbr = pbr;
        s.theme = theme;
        s.description = description;
        s.shares = marketCap / price;
        s.fairValue = (double) price;
        s.startSession();
        return s;
    }

    /** 새 컬럼이 비어 있는 기존 데이터 보정 (개편 전 DB) */
    public boolean ensureInitialized() {
        boolean changed = false;
        if (shares == null || shares <= 0) {
            shares = Math.max(1_000_000L, (marketCap != null ? marketCap : 100_000_000_000L) / Math.max(1, currentPrice));
            changed = true;
        }
        if (fairValue == null) {
            fairValue = (double) currentPrice;
            changed = true;
        }
        if (dayOpen == null) {
            // 기존 기준가가 갱신되지 않아 상·하한가에 붙어 있던 문제 → 현재가 기준으로 새 거래일 시작
            previousClose = currentPrice;
            startSession();
            changed = true;
        }
        return changed;
    }

    /** 새 거래일 시작 (시가 = 현재가) */
    public void startSession() {
        dayOpen = currentPrice;
        dayHigh = currentPrice;
        dayLow = currentPrice;
        dayVolume = 0L;
        dayAmount = 0L;
    }

    /** 장 마감: 종가를 다음 거래일 기준가로 */
    public void closeSession() {
        previousClose = currentPrice;
        startSession();
    }

    /** 체결 반영 */
    public void applyTrade(long price, long volume) {
        currentPrice = price;
        dayHigh = Math.max(dayHigh, price);
        dayLow = Math.min(dayLow, price);
        dayVolume += volume;
        dayAmount += price * volume;
    }

    public void setFairValue(double fairValue) {
        this.fairValue = fairValue;
    }

    public long marketCapNow() {
        return currentPrice * (shares != null ? shares : 0);
    }
}
