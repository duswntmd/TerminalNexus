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
}
