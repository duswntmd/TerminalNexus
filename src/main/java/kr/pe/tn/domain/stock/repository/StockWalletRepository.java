package kr.pe.tn.domain.stock.repository;

import jakarta.persistence.LockModeType;
import kr.pe.tn.domain.stock.entity.StockWalletEntity;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface StockWalletRepository extends JpaRepository<StockWalletEntity, Long> {
    Optional<StockWalletEntity> findByUser(UserEntity user);

    /** 잔고 변경용 (주문과 자동 체결이 동시에 들어와도 덮어쓰지 않도록 쓰기 잠금) */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM StockWalletEntity w WHERE w.user = :user")
    Optional<StockWalletEntity> findByUserForUpdate(@Param("user") UserEntity user);
}
