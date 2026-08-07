package kr.pe.tn.domain.stock.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 거래 내역 (매수/매도 로그)
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "stock_trade")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockTradeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "ticker", nullable = false, length = 10)
    private String ticker;

    /** BUY 또는 SELL */
    @Enumerated(EnumType.STRING)
    @Column(name = "trade_type", nullable = false)
    private TradeType tradeType;

    @Column(name = "quantity", nullable = false)
    private Long quantity;

    @Column(name = "price", nullable = false)
    private Long price;

    @CreatedDate
    @Column(name = "traded_at", updatable = false)
    private LocalDateTime tradedAt;

    public enum TradeType {
        BUY, SELL
    }

    public Long getId() { return id; }
    public UserEntity getUser() { return user; }
    public String getTicker() { return ticker; }
    public TradeType getTradeType() { return tradeType; }
    public Long getQuantity() { return quantity; }
    public Long getPrice() { return price; }
    public LocalDateTime getTradedAt() { return tradedAt; }

    public static StockTradeEntityBuilder builder() { return new StockTradeEntityBuilder(); }

    public static class StockTradeEntityBuilder {
        private UserEntity user;
        private String ticker;
        private TradeType tradeType;
        private Long quantity;
        private Long price;

        public StockTradeEntityBuilder user(UserEntity user) { this.user = user; return this; }
        public StockTradeEntityBuilder ticker(String ticker) { this.ticker = ticker; return this; }
        public StockTradeEntityBuilder tradeType(TradeType tradeType) { this.tradeType = tradeType; return this; }
        public StockTradeEntityBuilder quantity(Long quantity) { this.quantity = quantity; return this; }
        public StockTradeEntityBuilder price(Long price) { this.price = price; return this; }

        public StockTradeEntity build() {
            StockTradeEntity t = new StockTradeEntity();
            t.user = this.user;
            t.ticker = this.ticker;
            t.tradeType = this.tradeType;
            t.quantity = this.quantity;
            t.price = this.price;
            return t;
        }
    }
}
