package kr.pe.tn.domain.stock.repository;

import kr.pe.tn.domain.stock.entity.StockEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockRepository extends JpaRepository<StockEntity, String> {
}
