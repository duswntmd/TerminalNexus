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

    public Long getId() { return id; }
    public FreeBoard getFreeBoard() { return freeBoard; }
    public UserEntity getUser() { return user; }

    public static FreeBoardDislikeBuilder builder() { return new FreeBoardDislikeBuilder(); }

    public static class FreeBoardDislikeBuilder {
        private FreeBoard freeBoard;
        private UserEntity user;

        public FreeBoardDislikeBuilder freeBoard(FreeBoard freeBoard) { this.freeBoard = freeBoard; return this; }
        public FreeBoardDislikeBuilder user(UserEntity user) { this.user = user; return this; }

        public FreeBoardDislike build() {
            FreeBoardDislike d = new FreeBoardDislike();
            d.freeBoard = this.freeBoard;
            d.user = this.user;
            return d;
        }
    }
}
