package kr.pe.tn.domain.lotto.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

/** 사용자가 저장한 로또 번호 한 게임 */
@Entity
@Table(name = "lotto_ticket", indexes = @Index(name = "idx_lotto_ticket_user", columnList = "user_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LottoTicketEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    /** 오름차순 번호 6개 "1,2,3,4,5,6" */
    @Column(nullable = false, length = 20)
    private String numbers;

    @Column(length = 30)
    private String label;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Builder
    public LottoTicketEntity(UserEntity user, String numbers, String label) {
        this.user = user;
        this.numbers = numbers;
        this.label = label;
        this.createdAt = LocalDateTime.now();
    }

    public List<Integer> numberList() {
        return Arrays.stream(numbers.split(",")).map(Integer::valueOf).toList();
    }
}
