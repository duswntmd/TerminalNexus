package kr.pe.tn.domain.stock.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.*;

/**
 * 유저별 보유 포지션 (LONG / SHORT, 레버리지 1x/2x 지원)
 */
@Entity
@Table(name = "stock_holding")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockHoldingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "ticker", nullable = false, length = 10)
    private String ticker;

    /** LONG (매수) 또는 SHORT (공매도) */
    @Enumerated(EnumType.STRING)
    @Column(name = "position_type", nullable = false)
    private StockOrderEntity.PositionType positionType;

    /** 레버리지 배수 (1 = 1x, 2 = 2x) */
    @Column(name = "leverage", nullable = false)
    private Integer leverage;

    /** 보유 수량 */
    @Column(name = "quantity", nullable = false)
    private Long quantity;

    /** 평균 체결 단가 */
    @Column(name = "avg_price", nullable = false)
    private Long avgPrice;

    /**
     * 포지션 추가 (동일 티커, 동일 포지션/레버리지일 때 평단가 재계산)
     */
    public void addPosition(long qty, long price) {
        long totalCost = this.avgPrice * this.quantity + price * qty;
        this.quantity += qty;
        this.avgPrice = totalCost / this.quantity;
    }

    /**
     * 포지션 청산 (수량 감소)
     */
    public void reducePosition(long qty) {
        this.quantity -= qty;
    }

    public Long getId() { return id; }
    public UserEntity getUser() { return user; }
    public String getTicker() { return ticker; }
    public StockOrderEntity.PositionType getPositionType() { return positionType; }
    public Integer getLeverage() { return leverage; }
    public Long getQuantity() { return quantity; }
    public Long getAvgPrice() { return avgPrice; }

    public static StockHoldingEntityBuilder builder() { return new StockHoldingEntityBuilder(); }

    public static class StockHoldingEntityBuilder {
        private UserEntity user;
        private String ticker;
        private StockOrderEntity.PositionType positionType;
        private Integer leverage;
        private Long quantity;
        private Long avgPrice;

        public StockHoldingEntityBuilder user(UserEntity user) { this.user = user; return this; }
        public StockHoldingEntityBuilder ticker(String ticker) { this.ticker = ticker; return this; }
        public StockHoldingEntityBuilder positionType(StockOrderEntity.PositionType positionType) { this.positionType = positionType; return this; }
        public StockHoldingEntityBuilder leverage(Integer leverage) { this.leverage = leverage; return this; }
        public StockHoldingEntityBuilder quantity(Long quantity) { this.quantity = quantity; return this; }
        public StockHoldingEntityBuilder avgPrice(Long avgPrice) { this.avgPrice = avgPrice; return this; }

        public StockHoldingEntity build() {
            StockHoldingEntity h = new StockHoldingEntity();
            h.user = this.user;
            h.ticker = this.ticker;
            h.positionType = this.positionType;
            h.leverage = this.leverage != null ? this.leverage : 1;
            h.quantity = this.quantity;
            h.avgPrice = this.avgPrice;
            return h;
        }
    }
}
