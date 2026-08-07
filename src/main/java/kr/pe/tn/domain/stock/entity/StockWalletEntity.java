package kr.pe.tn.domain.stock.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.*;

/**
 * 유저 가상 지갑 (1인 1계좌)
 * 최초 /api/stock/wallet 접근 시 1,000,000원 자동 지급
 */
@Entity
@Table(name = "stock_wallet")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockWalletEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserEntity user;

    /** 보유 현금 */
    @Column(name = "cash", nullable = false)
    private Long cash;

    public void deposit(long amount) {
        this.cash += amount;
    }

    public void withdraw(long amount) {
        this.cash -= amount;
    }

    public Long getId() { return id; }
    public UserEntity getUser() { return user; }
    public Long getCash() { return cash; }

    public static StockWalletEntityBuilder builder() { return new StockWalletEntityBuilder(); }

    public static class StockWalletEntityBuilder {
        private UserEntity user;
        private Long cash;

        public StockWalletEntityBuilder user(UserEntity user) { this.user = user; return this; }
        public StockWalletEntityBuilder cash(Long cash) { this.cash = cash; return this; }

        public StockWalletEntity build() {
            StockWalletEntity w = new StockWalletEntity();
            w.user = this.user;
            w.cash = this.cash != null ? this.cash : 1_000_000L;
            return w;
        }
    }
}
