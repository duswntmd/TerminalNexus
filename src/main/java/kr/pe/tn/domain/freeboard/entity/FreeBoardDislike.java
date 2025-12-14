package kr.pe.tn.domain.freeboard.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.*;

@Entity
@Table(name = "free_board_dislike", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "board_id", "user_id" })
})
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString(exclude = { "freeBoard", "user" })
public class FreeBoardDislike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private FreeBoard freeBoard;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

}
