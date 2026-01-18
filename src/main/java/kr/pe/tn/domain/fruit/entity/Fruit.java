package kr.pe.tn.domain.fruit.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * 과일 정보 엔티티
 * RAG 시스템에서 검색할 과일 효능 데이터를 저장
 */
@Entity
@Table(name = "fruits")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Fruit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name; // 과일 이름 (예: 사과, 바나나)

    @Column(nullable = false, length = 100)
    private String englishName; // 영어 이름 (예: Apple, Banana)

    @Column(columnDefinition = "TEXT")
    private String benefits; // 효능 (예: 비타민C 풍부, 항산화 효과)

    @Column(columnDefinition = "TEXT")
    private String nutrients; // 영양소 (예: 비타민A, 비타민C, 칼륨)

    @Column(columnDefinition = "TEXT")
    private String description; // 상세 설명

    @Column(length = 100)
    private String season; // 제철 시기 (예: 가을, 여름)

    @Column(length = 50)
    private String origin; // 원산지 (예: 한국, 열대 지방)
}
