package kr.pe.tn.domain.fruit.repository;

import kr.pe.tn.domain.fruit.entity.Fruit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 과일 정보 Repository
 * RAG 시스템에서 관련 과일 정보를 검색하기 위한 쿼리 메서드 제공
 */
@Repository
public interface FruitRepository extends JpaRepository<Fruit, Long> {

    /**
     * 과일 이름으로 검색 (부분 일치)
     */
    List<Fruit> findByNameContaining(String name);

    /**
     * 효능으로 검색 (부분 일치)
     * 예: "비타민" 검색 시 비타민이 포함된 모든 과일 반환
     */
    List<Fruit> findByBenefitsContaining(String keyword);

    /**
     * 영양소로 검색 (부분 일치)
     */
    List<Fruit> findByNutrientsContaining(String nutrient);

    /**
     * 키워드로 전체 검색 (이름, 효능, 영양소, 설명 모두 포함)
     * RAG에서 관련 문서를 찾기 위한 핵심 메서드
     */
    @Query("SELECT f FROM Fruit f WHERE " +
            "f.name LIKE %:keyword% OR " +
            "f.englishName LIKE %:keyword% OR " +
            "f.benefits LIKE %:keyword% OR " +
            "f.nutrients LIKE %:keyword% OR " +
            "f.description LIKE %:keyword%")
    List<Fruit> searchByKeyword(@Param("keyword") String keyword);
}
