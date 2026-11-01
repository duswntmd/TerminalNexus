package kr.pe.tn.domain.agephoto.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** 사용자별 하루 생성 횟수. 사진과 결과물은 저장하지 않고 횟수만 남긴다. */
@Entity
@Table(name = "age_photo_usage", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "usage_date"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AgePhotoUsageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "usage_date", nullable = false)
    private LocalDate usageDate;

    @Column(name = "used_count", nullable = false)
    private int used;

    public AgePhotoUsageEntity(Long userId, LocalDate usageDate) {
        this.userId = userId;
        this.usageDate = usageDate;
    }

    public void add(int delta) {
        this.used = Math.max(0, used + delta);
    }
}
