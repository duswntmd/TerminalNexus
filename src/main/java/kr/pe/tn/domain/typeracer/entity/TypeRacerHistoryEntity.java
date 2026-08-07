package kr.pe.tn.domain.typeracer.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "typeracer_history")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TypeRacerHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "wpm", nullable = false)
    private Integer wpm;

    @Column(name = "accuracy", nullable = false)
    private Double accuracy;

    @CreatedDate
    @Column(name = "created_date", updatable = false)
    private LocalDateTime createdDate;

    public Long getId() { return id; }
    public UserEntity getUser() { return user; }
    public Integer getWpm() { return wpm; }
    public Double getAccuracy() { return accuracy; }
    public LocalDateTime getCreatedDate() { return createdDate; }

    public static TypeRacerHistoryEntityBuilder builder() { return new TypeRacerHistoryEntityBuilder(); }

    public static class TypeRacerHistoryEntityBuilder {
        private UserEntity user;
        private Integer wpm;
        private Double accuracy;

        public TypeRacerHistoryEntityBuilder user(UserEntity user) { this.user = user; return this; }
        public TypeRacerHistoryEntityBuilder wpm(Integer wpm) { this.wpm = wpm; return this; }
        public TypeRacerHistoryEntityBuilder accuracy(Double accuracy) { this.accuracy = accuracy; return this; }

        public TypeRacerHistoryEntity build() {
            TypeRacerHistoryEntity h = new TypeRacerHistoryEntity();
            h.user = this.user;
            h.wpm = this.wpm;
            h.accuracy = this.accuracy;
            return h;
        }
    }
}
