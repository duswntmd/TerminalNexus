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

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockItemResponse {
        private String ticker;
        private String name;
        private Long currentPrice;
        private Long previousClose;
        private Double volatility;
        private Double changeRate; // 등락률 (%)
        private Long changeAmount; // 변동금액
        private Boolean isUpperLimit; // 상한가 여부 (+30%)
        private Boolean isLowerLimit; // 하한가 여부 (-30%)
        private Boolean isCircuitBreaker; // 서킷브레이커발동
        private String currentTrend; // BULL, BEAR, SIDEWAYS
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PriceHistoryResponse {
        private Long id;
        private String ticker;
        private Long price;
        private LocalDateTime recordedAt;
    }

    // ── 캔들스틱 (봉차트 OHLC) DTO ──
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CandleResponse {
        private Long open;  // 시가
        private Long high;  // 고가
        private Long low;   // 저가
        private Long close; // 종가
        private String time;// 시각
    }

    // ── 실시간 10호가창 (Order Book) DTO ──
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderBookResponse {
        private String ticker;
        private Long currentPrice;
        private List<OrderBookItem> askOrders; // 매도 호가 5단계 (가격 내림차순)
        private List<OrderBookItem> bidOrders; // 매수 호가 5단계 (가격 내림차순)
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderBookItem {
        private Long price;
        private Long quantity;
        private Double ratio; // 잔량 비율 (%)
    }

    // ── 기업 재무 및 상세 정보 DTO ──
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompanyDetailResponse {
        private String ticker;
        private String name;
        private Long currentPrice;
        private Long previousClose;
        private Long marketCap; // 시가총액
        private Double per;
        private Double pbr;
        private String theme; // 대표 테마
        private String description; // 기업 설명
        private Double volatility;
    }

    // ── 속보 뉴스 DTO ──
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockNewsResponse {
        private String id;
        private String ticker;
        private String stockName;
        private String title;
        private String newsType; // GOOD, BAD, NEUTRAL
        private Double priceImpactPercent;
        private LocalDateTime createdAt;
    }

    // ── 고도화 주문 요청 DTO (지정가/공매도/레버리지 지원) ──
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderRequest {
        private String ticker;
        private StockTradeEntity.TradeType tradeType; // BUY (진입/청산), SELL
        private StockOrderEntity.PositionType positionType; // LONG (매수), SHORT (공매도)
        private StockOrderEntity.OrderType orderType; // MARKET (시장가), LIMIT (지정가)
        private Integer leverage; // 1 (1x), 2 (2x)
        private Long targetPrice; // 지정가 가격 (지정가일 때만 사용)
        private Long quantity; // 주문 수량
    }

    // ── 구 버전 호환용 TradeRequest ──
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TradeRequest {
        private String ticker;
        private Long quantity;
    }

    // ── 미체결 예약 주문 응답 DTO ──
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PendingOrderResponse {
        private Long orderId;
        private String ticker;
        private String stockName;
        private String tradeType; // BUY, SELL
        private String positionType; // LONG, SHORT
        private String orderType; // MARKET, LIMIT
        private Integer leverage;
        private Long targetPrice;
        private Long quantity;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WalletResponse {
        private Long cash;
        private Long totalAsset; // 현금 + 보유 주식 평가금액
        private Long totalInvested; // 총 투자금액
        private Double totalReturnRate; // 전체 수익률 (%)
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HoldingResponse {
        private Long holdingId;
        private String ticker;
        private String stockName;
        private String positionType; // LONG, SHORT
        private Integer leverage; // 1, 2
        private Long quantity;
        private Long avgPrice;
        private Long currentPrice;
        private Long totalEvaluation; // 평가금액
        private Long totalProfit; // 평가손익
        private Double returnRate; // 수익률 (%)
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
        private String positionType;
        private Integer leverage;
        private Long quantity;
        private Long price;
        private Long totalAmount;
        private LocalDateTime tradedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaderboardResponse {
        private Long userId;
        private String nickname;
        private Long totalAsset;
        private Long cash;
        private Long evaluation;
        private Double returnRate;
    }
}
