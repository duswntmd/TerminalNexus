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
@NoArgsConstructor
@AllArgsConstructor
public class Fruit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 100)
    private String englishName;

    @Column(columnDefinition = "TEXT")
    private String benefits;

    @Column(columnDefinition = "TEXT")
    private String nutrients;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String season;

    @Column(length = 50)
    private String origin;

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEnglishName() { return englishName; }
    public String getBenefits() { return benefits; }
    public String getNutrients() { return nutrients; }
    public String getDescription() { return description; }
    public String getSeason() { return season; }
    public String getOrigin() { return origin; }

    public static FruitBuilder builder() {
        return new FruitBuilder();
    }

    public static class FruitBuilder {
        private String name;
        private String englishName;
        private String benefits;
        private String nutrients;
        private String description;
        private String season;
        private String origin;

        public FruitBuilder name(String name) { this.name = name; return this; }
        public FruitBuilder englishName(String englishName) { this.englishName = englishName; return this; }
        public FruitBuilder benefits(String benefits) { this.benefits = benefits; return this; }
        public FruitBuilder nutrients(String nutrients) { this.nutrients = nutrients; return this; }
        public FruitBuilder description(String description) { this.description = description; return this; }
        public FruitBuilder season(String season) { this.season = season; return this; }
        public FruitBuilder origin(String origin) { this.origin = origin; return this; }

        public Fruit build() {
            Fruit f = new Fruit();
            f.name = this.name;
            f.englishName = this.englishName;
            f.benefits = this.benefits;
            f.nutrients = this.nutrients;
            f.description = this.description;
            f.season = this.season;
            f.origin = this.origin;
            return f;
        }
    }
}
