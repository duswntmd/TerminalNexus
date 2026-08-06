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
}
