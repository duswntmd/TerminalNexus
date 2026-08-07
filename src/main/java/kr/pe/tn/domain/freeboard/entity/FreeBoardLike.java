package kr.pe.tn.domain.freeboard.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.*;

@Entity
@Table(name = "free_board_like", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "board_id", "user_id" })
})
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString(exclude = { "freeBoard", "user" })
public class FreeBoardLike {

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

    public static FreeBoardLikeBuilder builder() { return new FreeBoardLikeBuilder(); }

    public static class FreeBoardLikeBuilder {
        private FreeBoard freeBoard;
        private UserEntity user;

        public FreeBoardLikeBuilder freeBoard(FreeBoard freeBoard) { this.freeBoard = freeBoard; return this; }
        public FreeBoardLikeBuilder user(UserEntity user) { this.user = user; return this; }

        public FreeBoardLike build() {
            FreeBoardLike l = new FreeBoardLike();
            l.freeBoard = this.freeBoard;
            l.user = this.user;
            return l;
        }
    }
}
