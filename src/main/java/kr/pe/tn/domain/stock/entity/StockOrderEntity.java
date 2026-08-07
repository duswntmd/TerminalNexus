package kr.pe.tn.domain.stock.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 지정가 / 공매도 / 레버리지 예약 주문 엔티티
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "stock_order", indexes = {
        @Index(name = "idx_order_status_ticker", columnList = "order_status, ticker")
})
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockOrderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "ticker", nullable = false, length = 10)
    private String ticker;

    /** BUY (매수) 또는 SELL (매도) */
    @Enumerated(EnumType.STRING)
    @Column(name = "trade_type", nullable = false)
    private StockTradeEntity.TradeType tradeType;

    /** LONG (상승에 투배) 또는 SHORT (하락에 투배 / 공매도) */
    @Enumerated(EnumType.STRING)
    @Column(name = "position_type", nullable = false)
    private PositionType positionType;

    /** MARKET (시장가) 또는 LIMIT (지정가) */
    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", nullable = false)
    private OrderType orderType;

    /** 레버리지 배수 (1 = 1x, 2 = 2x) */
    @Column(name = "leverage", nullable = false)
    private Integer leverage;

    /** 주문 희망 지정가 (시장가일 경우 당시 시세) */
    @Column(name = "target_price", nullable = false)
    private Long targetPrice;

    /** 주문 수량 */
    @Column(name = "quantity", nullable = false)
    private Long quantity;

    /** PENDING (미체결), FILLED (체결완료), CANCELLED (취소됨) */
    @Enumerated(EnumType.STRING)
    @Column(name = "order_status", nullable = false)
    private OrderStatus orderStatus;

    /** 체결 시각 */
    @Column(name = "filled_at")
    private LocalDateTime filledAt;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum PositionType {
        LONG, SHORT
    }

    public enum OrderType {
        MARKET, LIMIT
    }

    public enum OrderStatus {
        PENDING, FILLED, CANCELLED
    }

    public void markAsFilled(LocalDateTime time) {
        this.orderStatus = OrderStatus.FILLED;
        this.filledAt = time;
    }

    public void cancel() {
        this.orderStatus = OrderStatus.CANCELLED;
    }

    public Long getId() { return id; }
    public UserEntity getUser() { return user; }
    public String getTicker() { return ticker; }
    public StockTradeEntity.TradeType getTradeType() { return tradeType; }
    public PositionType getPositionType() { return positionType; }
    public OrderType getOrderType() { return orderType; }
    public Integer getLeverage() { return leverage; }
    public Long getTargetPrice() { return targetPrice; }
    public Long getQuantity() { return quantity; }
    public OrderStatus getOrderStatus() { return orderStatus; }
    public LocalDateTime getFilledAt() { return filledAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public static StockOrderEntityBuilder builder() { return new StockOrderEntityBuilder(); }

    public static class StockOrderEntityBuilder {
        private UserEntity user;
        private String ticker;
        private StockTradeEntity.TradeType tradeType;
        private PositionType positionType;
        private OrderType orderType;
        private Integer leverage;
        private Long targetPrice;
        private Long quantity;
        private OrderStatus orderStatus = OrderStatus.PENDING;

        public StockOrderEntityBuilder user(UserEntity user) { this.user = user; return this; }
        public StockOrderEntityBuilder ticker(String ticker) { this.ticker = ticker; return this; }
        public StockOrderEntityBuilder tradeType(StockTradeEntity.TradeType tradeType) { this.tradeType = tradeType; return this; }
        public StockOrderEntityBuilder positionType(PositionType positionType) { this.positionType = positionType; return this; }
        public StockOrderEntityBuilder orderType(OrderType orderType) { this.orderType = orderType; return this; }
        public StockOrderEntityBuilder leverage(Integer leverage) { this.leverage = leverage; return this; }
        public StockOrderEntityBuilder targetPrice(Long targetPrice) { this.targetPrice = targetPrice; return this; }
        public StockOrderEntityBuilder quantity(Long quantity) { this.quantity = quantity; return this; }
        public StockOrderEntityBuilder orderStatus(OrderStatus orderStatus) { this.orderStatus = orderStatus; return this; }

        public StockOrderEntity build() {
            StockOrderEntity o = new StockOrderEntity();
            o.user = this.user;
            o.ticker = this.ticker;
            o.tradeType = this.tradeType;
            o.positionType = this.positionType;
            o.orderType = this.orderType;
            o.leverage = this.leverage != null ? this.leverage : 1;
            o.targetPrice = this.targetPrice;
            o.quantity = this.quantity;
            o.orderStatus = this.orderStatus != null ? this.orderStatus : OrderStatus.PENDING;
            return o;
        }
    }
}
