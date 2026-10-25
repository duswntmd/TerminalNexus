package kr.pe.tn.domain.stock.dto;

import kr.pe.tn.domain.stock.entity.StockOrderEntity;
import kr.pe.tn.domain.stock.entity.StockTradeEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class StockDTO {

    /** 종목 시세 (목록·실시간) */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockItemResponse {
        private String ticker;
        private String name;
        private String theme;
        private long currentPrice;
        private long previousClose;   // 기준가
        private long changeAmount;
        private double changeRate;
        private long open;
        private long high;
        private long low;
        private long volume;
        private long tradeValue;      // 거래대금
        private long upperLimit;
        private long lowerLimit;
        private long tickSize;
        private long marketCap;
        private boolean upperLimitHit;
        private boolean lowerLimitHit;
    }

    /** 실시간 방송 (/topic/stock-market) */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarketSnapshot {
        private List<StockItemResponse> stocks;
        private List<TickResponse> ticks;   // 이번 틱의 종목별 체결
        private long sessionEndsAt;         // 장 마감 시각 (epoch ms)
        private long serverTime;
    }

    /** 체결 (시간·가격·수량·매수/매도 주도) */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TickResponse {
        private String ticker;
        private long time;      // epoch ms
        private long price;
        private long quantity;
        private String side;    // BUY(매수 체결) / SELL(매도 체결)
    }

    /** 봉 (time: epoch 초) */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CandleResponse {
        private long time;
        private long open;
        private long high;
        private long low;
        private long close;
        private long volume;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderBookItem {
        private long price;
        private long quantity;
        private long myQuantity; // 내 미체결 주문 수량
    }

    /** 10단 호가 (asks: 높은 가격부터, bids: 높은 가격부터) */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderBookResponse {
        private String ticker;
        private long currentPrice;
        private long previousClose;
        private List<OrderBookItem> asks;
        private List<OrderBookItem> bids;
        private long totalAsk;
        private long totalBid;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompanyDetailResponse {
        private String ticker;
        private String name;
        private long currentPrice;
        private long previousClose;
        private long marketCap;
        private long shares;
        private Double per;
        private Double pbr;
        private String theme;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockNewsResponse {
        private String id;
        private String ticker;
        private String stockName;
        private String title;
        private String newsType; // GOOD / BAD
        private double priceImpactPercent;
        private LocalDateTime createdAt;
    }

    /** 주문 요청 */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderRequest {
        private String ticker;
        private StockTradeEntity.TradeType tradeType;   // BUY / SELL
        private StockOrderEntity.OrderType orderType;   // MARKET / LIMIT
        private Long price;                             // 지정가 (시장가는 무시)
        private long quantity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderResult {
        private String message;
        private boolean filled;
        private long fillPrice;
    }

    /** 계좌 요약 */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WalletResponse {
        private long cash;            // 주문가능금액
        private long reservedCash;    // 미체결 매수에 묶인 금액
        private long purchaseAmount;  // 매입금액 합계
        private long evaluation;      // 평가금액 합계
        private long evalProfit;      // 평가손익
        private long totalAsset;      // 총자산
        private long initialCash;
        private double totalReturnRate; // 원금 대비 수익률
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HoldingResponse {
        private String ticker;
        private String stockName;
        private long quantity;
        private long sellableQuantity;
        private long avgPrice;
        private long currentPrice;
        private long purchaseAmount;
        private long evaluation;
        private long profit;
        private double returnRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TradeHistoryResponse {
        private Long id;
        private String ticker;
        private String stockName;
        private String tradeType;
        private long quantity;
        private long price;
        private long amount;
        private long fee;
        private LocalDateTime tradedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PendingOrderResponse {
        private Long orderId;
        private String ticker;
        private String stockName;
        private String tradeType;
        private long price;
        private long quantity;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaderboardResponse {
        private Long userId;
        private String nickname;
        private long totalAsset;
        private double returnRate;
    }
}
