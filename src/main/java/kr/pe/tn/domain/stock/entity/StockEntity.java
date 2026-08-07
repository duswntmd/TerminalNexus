package kr.pe.tn.domain.stock.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * 가상 주식 종목 정보
 */
@Entity
@Table(name = "stock_item")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockEntity {

    @Id
    @Column(name = "ticker", length = 10)
    private String ticker;

    @Column(name = "name", nullable = false)
    private String name;

    /** 현재가 (원) */
    @Column(name = "current_price", nullable = false)
    private Long currentPrice;

    /** 전일 종가 (등락률 계산용) */
    @Column(name = "previous_close", nullable = false)
    private Long previousClose;

    /** 변동성 계수 (0.01 = 1%) */
    @Column(name = "volatility", nullable = false)
    private Double volatility;

    // ── 기업 재무 및 상세 정보 필드 ──
    @Column(name = "market_cap")
    private Long marketCap; // 시가총액 (원)

    @Column(name = "per")
    private Double per; // 주가수익비율 (PER)

    @Column(name = "pbr")
    private Double pbr; // 주가순자산비율 (PBR)

    @Column(name = "theme", length = 50)
    private String theme; // 대표 테마 (AI, 보안, 게임 등)

    @Column(name = "description", length = 500)
    private String description; // 기업 개요 설명

    public void updatePrice(Long newPrice) {
        this.currentPrice = newPrice;
    }

    public void closeDailyPrice() {
        this.previousClose = this.currentPrice;
    }

    public String getTicker() { return ticker; }
    public String getName() { return name; }
    public Long getCurrentPrice() { return currentPrice; }
    public Long getPreviousClose() { return previousClose; }
    public Double getVolatility() { return volatility; }
    public Long getMarketCap() { return marketCap; }
    public Double getPer() { return per; }
    public Double getPbr() { return pbr; }
    public String getTheme() { return theme; }
    public String getDescription() { return description; }

    public static StockEntityBuilder builder() { return new StockEntityBuilder(); }

    public static class StockEntityBuilder {
        private String ticker;
        private String name;
        private Long currentPrice;
        private Long previousClose;
        private Double volatility;
        private Long marketCap;
        private Double per;
        private Double pbr;
        private String theme;
        private String description;

        public StockEntityBuilder ticker(String ticker) { this.ticker = ticker; return this; }
        public StockEntityBuilder name(String name) { this.name = name; return this; }
        public StockEntityBuilder currentPrice(Long currentPrice) { this.currentPrice = currentPrice; return this; }
        public StockEntityBuilder previousClose(Long previousClose) { this.previousClose = previousClose; return this; }
        public StockEntityBuilder volatility(Double volatility) { this.volatility = volatility; return this; }
        public StockEntityBuilder marketCap(Long marketCap) { this.marketCap = marketCap; return this; }
        public StockEntityBuilder per(Double per) { this.per = per; return this; }
        public StockEntityBuilder pbr(Double pbr) { this.pbr = pbr; return this; }
        public StockEntityBuilder theme(String theme) { this.theme = theme; return this; }
        public StockEntityBuilder description(String description) { this.description = description; return this; }

        public StockEntity build() {
            StockEntity s = new StockEntity();
            s.ticker = this.ticker;
            s.name = this.name;
            s.currentPrice = this.currentPrice;
            s.previousClose = this.previousClose;
            s.volatility = this.volatility;
            s.marketCap = this.marketCap;
            s.per = this.per;
            s.pbr = this.pbr;
            s.theme = this.theme;
            s.description = this.description;
            return s;
        }
    }
}
