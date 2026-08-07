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

        public static StockItemResponseBuilder builder() { return new StockItemResponseBuilder(); }
        public static class StockItemResponseBuilder {
            private String ticker;
            private String name;
            private Long currentPrice;
            private Long previousClose;
            private Double volatility;
            private Double changeRate;
            private Long changeAmount;
            private Boolean isUpperLimit;
            private Boolean isLowerLimit;
            private Boolean isCircuitBreaker;
            private String currentTrend;

            public StockItemResponseBuilder ticker(String ticker) { this.ticker = ticker; return this; }
            public StockItemResponseBuilder name(String name) { this.name = name; return this; }
            public StockItemResponseBuilder currentPrice(Long currentPrice) { this.currentPrice = currentPrice; return this; }
            public StockItemResponseBuilder previousClose(Long previousClose) { this.previousClose = previousClose; return this; }
            public StockItemResponseBuilder volatility(Double volatility) { this.volatility = volatility; return this; }
            public StockItemResponseBuilder changeRate(Double changeRate) { this.changeRate = changeRate; return this; }
            public StockItemResponseBuilder changeAmount(Long changeAmount) { this.changeAmount = changeAmount; return this; }
            public StockItemResponseBuilder isUpperLimit(Boolean isUpperLimit) { this.isUpperLimit = isUpperLimit; return this; }
            public StockItemResponseBuilder isLowerLimit(Boolean isLowerLimit) { this.isLowerLimit = isLowerLimit; return this; }
            public StockItemResponseBuilder isCircuitBreaker(Boolean isCircuitBreaker) { this.isCircuitBreaker = isCircuitBreaker; return this; }
            public StockItemResponseBuilder currentTrend(String currentTrend) { this.currentTrend = currentTrend; return this; }

            public StockItemResponse build() {
                StockItemResponse r = new StockItemResponse();
                r.ticker = this.ticker;
                r.name = this.name;
                r.currentPrice = this.currentPrice;
                r.previousClose = this.previousClose;
                r.volatility = this.volatility;
                r.changeRate = this.changeRate;
                r.changeAmount = this.changeAmount;
                r.isUpperLimit = this.isUpperLimit;
                r.isLowerLimit = this.isLowerLimit;
                r.isCircuitBreaker = this.isCircuitBreaker;
                r.currentTrend = this.currentTrend;
                return r;
            }
        }
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

        public static PriceHistoryResponseBuilder builder() { return new PriceHistoryResponseBuilder(); }
        public static class PriceHistoryResponseBuilder {
            private Long id;
            private String ticker;
            private Long price;
            private LocalDateTime recordedAt;

            public PriceHistoryResponseBuilder id(Long id) { this.id = id; return this; }
            public PriceHistoryResponseBuilder ticker(String ticker) { this.ticker = ticker; return this; }
            public PriceHistoryResponseBuilder price(Long price) { this.price = price; return this; }
            public PriceHistoryResponseBuilder recordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; return this; }

            public PriceHistoryResponse build() {
                PriceHistoryResponse p = new PriceHistoryResponse();
                p.id = this.id;
                p.ticker = this.ticker;
                p.price = this.price;
                p.recordedAt = this.recordedAt;
                return p;
            }
        }
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

        public static CandleResponseBuilder builder() { return new CandleResponseBuilder(); }
        public static class CandleResponseBuilder {
            private Long open;
            private Long high;
            private Long low;
            private Long close;
            private String time;

            public CandleResponseBuilder open(Long open) { this.open = open; return this; }
            public CandleResponseBuilder high(Long high) { this.high = high; return this; }
            public CandleResponseBuilder low(Long low) { this.low = low; return this; }
            public CandleResponseBuilder close(Long close) { this.close = close; return this; }
            public CandleResponseBuilder time(String time) { this.time = time; return this; }

            public CandleResponse build() {
                CandleResponse c = new CandleResponse();
                c.open = this.open;
                c.high = this.high;
                c.low = this.low;
                c.close = this.close;
                c.time = this.time;
                return c;
            }
        }
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

        public static OrderBookResponseBuilder builder() { return new OrderBookResponseBuilder(); }
        public static class OrderBookResponseBuilder {
            private String ticker;
            private Long currentPrice;
            private List<OrderBookItem> askOrders;
            private List<OrderBookItem> bidOrders;

            public OrderBookResponseBuilder ticker(String ticker) { this.ticker = ticker; return this; }
            public OrderBookResponseBuilder currentPrice(Long currentPrice) { this.currentPrice = currentPrice; return this; }
            public OrderBookResponseBuilder askOrders(List<OrderBookItem> askOrders) { this.askOrders = askOrders; return this; }
            public OrderBookResponseBuilder bidOrders(List<OrderBookItem> bidOrders) { this.bidOrders = bidOrders; return this; }

            public OrderBookResponse build() {
                OrderBookResponse r = new OrderBookResponse();
                r.ticker = this.ticker;
                r.currentPrice = this.currentPrice;
                r.askOrders = this.askOrders;
                r.bidOrders = this.bidOrders;
                return r;
            }
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderBookItem {
        private Long price;
        private Long quantity;
        private Double ratio; // 잔량 비율 (%)

        public static OrderBookItemBuilder builder() { return new OrderBookItemBuilder(); }
        public static class OrderBookItemBuilder {
            private Long price;
            private Long quantity;
            private Double ratio;

            public OrderBookItemBuilder price(Long price) { this.price = price; return this; }
            public OrderBookItemBuilder quantity(Long quantity) { this.quantity = quantity; return this; }
            public OrderBookItemBuilder ratio(Double ratio) { this.ratio = ratio; return this; }

            public OrderBookItem build() {
                OrderBookItem i = new OrderBookItem();
                i.price = this.price;
                i.quantity = this.quantity;
                i.ratio = this.ratio;
                return i;
            }
        }
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

        public static CompanyDetailResponseBuilder builder() { return new CompanyDetailResponseBuilder(); }
        public static class CompanyDetailResponseBuilder {
            private String ticker;
            private String name;
            private Long currentPrice;
            private Long previousClose;
            private Long marketCap;
            private Double per;
            private Double pbr;
            private String theme;
            private String description;
            private Double volatility;

            public CompanyDetailResponseBuilder ticker(String ticker) { this.ticker = ticker; return this; }
            public CompanyDetailResponseBuilder name(String name) { this.name = name; return this; }
            public CompanyDetailResponseBuilder currentPrice(Long currentPrice) { this.currentPrice = currentPrice; return this; }
            public CompanyDetailResponseBuilder previousClose(Long previousClose) { this.previousClose = previousClose; return this; }
            public CompanyDetailResponseBuilder marketCap(Long marketCap) { this.marketCap = marketCap; return this; }
            public CompanyDetailResponseBuilder per(Double per) { this.per = per; return this; }
            public CompanyDetailResponseBuilder pbr(Double pbr) { this.pbr = pbr; return this; }
            public CompanyDetailResponseBuilder theme(String theme) { this.theme = theme; return this; }
            public CompanyDetailResponseBuilder description(String description) { this.description = description; return this; }
            public CompanyDetailResponseBuilder volatility(Double volatility) { this.volatility = volatility; return this; }

            public CompanyDetailResponse build() {
                CompanyDetailResponse c = new CompanyDetailResponse();
                c.ticker = this.ticker;
                c.name = this.name;
                c.currentPrice = this.currentPrice;
                c.previousClose = this.previousClose;
                c.marketCap = this.marketCap;
                c.per = this.per;
                c.pbr = this.pbr;
                c.theme = this.theme;
                c.description = this.description;
                c.volatility = this.volatility;
                return c;
            }
        }
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

        public static StockNewsResponseBuilder builder() { return new StockNewsResponseBuilder(); }
        public static class StockNewsResponseBuilder {
            private String id;
            private String ticker;
            private String stockName;
            private String title;
            private String newsType;
            private Double priceImpactPercent;
            private LocalDateTime createdAt;

            public StockNewsResponseBuilder id(String id) { this.id = id; return this; }
            public StockNewsResponseBuilder ticker(String ticker) { this.ticker = ticker; return this; }
            public StockNewsResponseBuilder stockName(String stockName) { this.stockName = stockName; return this; }
            public StockNewsResponseBuilder title(String title) { this.title = title; return this; }
            public StockNewsResponseBuilder newsType(String newsType) { this.newsType = newsType; return this; }
            public StockNewsResponseBuilder priceImpactPercent(Double priceImpactPercent) { this.priceImpactPercent = priceImpactPercent; return this; }
            public StockNewsResponseBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

            public StockNewsResponse build() {
                StockNewsResponse r = new StockNewsResponse();
                r.id = this.id;
                r.ticker = this.ticker;
                r.stockName = this.stockName;
                r.title = this.title;
                r.newsType = this.newsType;
                r.priceImpactPercent = this.priceImpactPercent;
                r.createdAt = this.createdAt;
                return r;
            }
        }
    }

    // ── 고도화 주문 요청 DTO (지정가/공매도/레버리지 지원) ──
    @Data
    public static class OrderRequest {
        private String ticker;
        private StockTradeEntity.TradeType tradeType; // BUY (진입/청산), SELL
        private StockOrderEntity.PositionType positionType; // LONG (매수), SHORT (공매도)
        private StockOrderEntity.OrderType orderType; // MARKET (시장가), LIMIT (지정가)
        private Integer leverage; // 1 (1x), 2 (2x)
        private Long targetPrice; // 지정가 가격 (지정가일 때만 사용)
        private Long quantity; // 주문 수량

        public OrderRequest() {}
        public OrderRequest(String ticker, StockTradeEntity.TradeType tradeType, StockOrderEntity.PositionType positionType, StockOrderEntity.OrderType orderType, Integer leverage, Long targetPrice, Long quantity) {
            this.ticker = ticker;
            this.tradeType = tradeType;
            this.positionType = positionType;
            this.orderType = orderType;
            this.leverage = leverage;
            this.targetPrice = targetPrice;
            this.quantity = quantity;
        }

        public String getTicker() { return ticker; }
        public void setTicker(String ticker) { this.ticker = ticker; }
        public StockTradeEntity.TradeType getTradeType() { return tradeType; }
        public void setTradeType(StockTradeEntity.TradeType tradeType) { this.tradeType = tradeType; }
        public StockOrderEntity.PositionType getPositionType() { return positionType; }
        public void setPositionType(StockOrderEntity.PositionType positionType) { this.positionType = positionType; }
        public StockOrderEntity.OrderType getOrderType() { return orderType; }
        public void setOrderType(StockOrderEntity.OrderType orderType) { this.orderType = orderType; }
        public Integer getLeverage() { return leverage; }
        public void setLeverage(Integer leverage) { this.leverage = leverage; }
        public Long getTargetPrice() { return targetPrice; }
        public void setTargetPrice(Long targetPrice) { this.targetPrice = targetPrice; }
        public Long getQuantity() { return quantity; }
        public void setQuantity(Long quantity) { this.quantity = quantity; }
    }

    // ── 구 버전 호환용 TradeRequest ──
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TradeRequest {
        private String ticker;
        private Long quantity;

        public String getTicker() { return ticker; }
        public void setTicker(String ticker) { this.ticker = ticker; }
        public Long getQuantity() { return quantity; }
        public void setQuantity(Long quantity) { this.quantity = quantity; }
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

        public static PendingOrderResponseBuilder builder() { return new PendingOrderResponseBuilder(); }
        public static class PendingOrderResponseBuilder {
            private Long orderId;
            private String ticker;
            private String stockName;
            private String tradeType;
            private String positionType;
            private String orderType;
            private Integer leverage;
            private Long targetPrice;
            private Long quantity;
            private LocalDateTime createdAt;

            public PendingOrderResponseBuilder orderId(Long orderId) { this.orderId = orderId; return this; }
            public PendingOrderResponseBuilder ticker(String ticker) { this.ticker = ticker; return this; }
            public PendingOrderResponseBuilder stockName(String stockName) { this.stockName = stockName; return this; }
            public PendingOrderResponseBuilder tradeType(String tradeType) { this.tradeType = tradeType; return this; }
            public PendingOrderResponseBuilder positionType(String positionType) { this.positionType = positionType; return this; }
            public PendingOrderResponseBuilder orderType(String orderType) { this.orderType = orderType; return this; }
            public PendingOrderResponseBuilder leverage(Integer leverage) { this.leverage = leverage; return this; }
            public PendingOrderResponseBuilder targetPrice(Long targetPrice) { this.targetPrice = targetPrice; return this; }
            public PendingOrderResponseBuilder quantity(Long quantity) { this.quantity = quantity; return this; }
            public PendingOrderResponseBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

            public PendingOrderResponse build() {
                PendingOrderResponse r = new PendingOrderResponse();
                r.orderId = this.orderId;
                r.ticker = this.ticker;
                r.stockName = this.stockName;
                r.tradeType = this.tradeType;
                r.positionType = this.positionType;
                r.orderType = this.orderType;
                r.leverage = this.leverage;
                r.targetPrice = this.targetPrice;
                r.quantity = this.quantity;
                r.createdAt = this.createdAt;
                return r;
            }
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WalletResponse {
        private Long cash;
        private Long totalAsset; // 현금 + 보유 주식 평가금액
        private Long totalInvested; // 총 투자금액
        private Long totalEvaluation; // 총 평가금액
        private Long totalUnrealizedPnl; // 평가 손익
        private Double totalReturnRate; // 수익률 (%)

        public static WalletResponseBuilder builder() { return new WalletResponseBuilder(); }
        public static class WalletResponseBuilder {
            private Long cash;
            private Long totalAsset;
            private Long totalInvested;
            private Long totalEvaluation;
            private Long totalUnrealizedPnl;
            private Double totalReturnRate;

            public WalletResponseBuilder cash(Long cash) { this.cash = cash; return this; }
            public WalletResponseBuilder totalAsset(Long totalAsset) { this.totalAsset = totalAsset; return this; }
            public WalletResponseBuilder totalInvested(Long totalInvested) { this.totalInvested = totalInvested; return this; }
            public WalletResponseBuilder totalEvaluation(Long totalEvaluation) { this.totalEvaluation = totalEvaluation; return this; }
            public WalletResponseBuilder totalUnrealizedPnl(Long totalUnrealizedPnl) { this.totalUnrealizedPnl = totalUnrealizedPnl; return this; }
            public WalletResponseBuilder totalReturnRate(Double totalReturnRate) { this.totalReturnRate = totalReturnRate; return this; }

            public WalletResponse build() {
                WalletResponse w = new WalletResponse();
                w.cash = this.cash;
                w.totalAsset = this.totalAsset;
                w.totalInvested = this.totalInvested;
                w.totalEvaluation = this.totalEvaluation;
                w.totalUnrealizedPnl = this.totalUnrealizedPnl;
                w.totalReturnRate = this.totalReturnRate;
                return w;
            }
        }
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

        public static HoldingResponseBuilder builder() { return new HoldingResponseBuilder(); }
        public static class HoldingResponseBuilder {
            private Long holdingId;
            private String ticker;
            private String stockName;
            private String positionType;
            private Integer leverage;
            private Long quantity;
            private Long avgPrice;
            private Long currentPrice;
            private Long totalEvaluation;
            private Long totalProfit;
            private Double returnRate;

            public HoldingResponseBuilder holdingId(Long holdingId) { this.holdingId = holdingId; return this; }
            public HoldingResponseBuilder ticker(String ticker) { this.ticker = ticker; return this; }
            public HoldingResponseBuilder stockName(String stockName) { this.stockName = stockName; return this; }
            public HoldingResponseBuilder positionType(String positionType) { this.positionType = positionType; return this; }
            public HoldingResponseBuilder leverage(Integer leverage) { this.leverage = leverage; return this; }
            public HoldingResponseBuilder quantity(Long quantity) { this.quantity = quantity; return this; }
            public HoldingResponseBuilder avgPrice(Long avgPrice) { this.avgPrice = avgPrice; return this; }
            public HoldingResponseBuilder currentPrice(Long currentPrice) { this.currentPrice = currentPrice; return this; }
            public HoldingResponseBuilder totalEvaluation(Long totalEvaluation) { this.totalEvaluation = totalEvaluation; return this; }
            public HoldingResponseBuilder totalProfit(Long totalProfit) { this.totalProfit = totalProfit; return this; }
            public HoldingResponseBuilder returnRate(Double returnRate) { this.returnRate = returnRate; return this; }

            public HoldingResponse build() {
                HoldingResponse h = new HoldingResponse();
                h.holdingId = this.holdingId;
                h.ticker = this.ticker;
                h.stockName = this.stockName;
                h.positionType = this.positionType;
                h.leverage = this.leverage;
                h.quantity = this.quantity;
                h.avgPrice = this.avgPrice;
                h.currentPrice = this.currentPrice;
                h.totalEvaluation = this.totalEvaluation;
                h.totalProfit = this.totalProfit;
                h.returnRate = this.returnRate;
                return h;
            }
        }
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

        public static TradeHistoryResponseBuilder builder() { return new TradeHistoryResponseBuilder(); }
        public static class TradeHistoryResponseBuilder {
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

            public TradeHistoryResponseBuilder id(Long id) { this.id = id; return this; }
            public TradeHistoryResponseBuilder ticker(String ticker) { this.ticker = ticker; return this; }
            public TradeHistoryResponseBuilder stockName(String stockName) { this.stockName = stockName; return this; }
            public TradeHistoryResponseBuilder tradeType(String tradeType) { this.tradeType = tradeType; return this; }
            public TradeHistoryResponseBuilder positionType(String positionType) { this.positionType = positionType; return this; }
            public TradeHistoryResponseBuilder leverage(Integer leverage) { this.leverage = leverage; return this; }
            public TradeHistoryResponseBuilder quantity(Long quantity) { this.quantity = quantity; return this; }
            public TradeHistoryResponseBuilder price(Long price) { this.price = price; return this; }
            public TradeHistoryResponseBuilder totalAmount(Long totalAmount) { this.totalAmount = totalAmount; return this; }
            public TradeHistoryResponseBuilder tradedAt(LocalDateTime tradedAt) { this.tradedAt = tradedAt; return this; }

            public TradeHistoryResponse build() {
                TradeHistoryResponse t = new TradeHistoryResponse();
                t.id = this.id;
                t.ticker = this.ticker;
                t.stockName = this.stockName;
                t.tradeType = this.tradeType;
                t.positionType = this.positionType;
                t.leverage = this.leverage;
                t.quantity = this.quantity;
                t.price = this.price;
                t.totalAmount = this.totalAmount;
                t.tradedAt = this.tradedAt;
                return t;
            }
        }
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

        public Long getUserId() { return userId; }
        public String getNickname() { return nickname; }
        public Long getTotalAsset() { return totalAsset; }
        public Long getCash() { return cash; }
        public Long getEvaluation() { return evaluation; }
        public Double getReturnRate() { return returnRate; }

        public static LeaderboardResponseBuilder builder() { return new LeaderboardResponseBuilder(); }
        public static class LeaderboardResponseBuilder {
            private Long userId;
            private String nickname;
            private Long totalAsset;
            private Long cash;
            private Long evaluation;
            private Double returnRate;

            public LeaderboardResponseBuilder userId(Long userId) { this.userId = userId; return this; }
            public LeaderboardResponseBuilder nickname(String nickname) { this.nickname = nickname; return this; }
            public LeaderboardResponseBuilder totalAsset(Long totalAsset) { this.totalAsset = totalAsset; return this; }
            public LeaderboardResponseBuilder cash(Long cash) { this.cash = cash; return this; }
            public LeaderboardResponseBuilder evaluation(Long evaluation) { this.evaluation = evaluation; return this; }
            public LeaderboardResponseBuilder returnRate(Double returnRate) { this.returnRate = returnRate; return this; }

            public LeaderboardResponse build() {
                LeaderboardResponse l = new LeaderboardResponse();
                l.userId = this.userId;
                l.nickname = this.nickname;
                l.totalAsset = this.totalAsset;
                l.cash = this.cash;
                l.evaluation = this.evaluation;
                l.returnRate = this.returnRate;
                return l;
            }
        }
    }
}
