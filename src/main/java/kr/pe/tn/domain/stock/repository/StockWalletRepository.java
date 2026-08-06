package kr.pe.tn.domain.stock.repository;

import kr.pe.tn.domain.stock.entity.StockWalletEntity;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StockWalletRepository extends JpaRepository<StockWalletEntity, Long> {
    Optional<StockWalletEntity> findByUser(UserEntity user);
}
