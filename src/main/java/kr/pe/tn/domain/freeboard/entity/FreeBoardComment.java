package kr.pe.tn.domain.freeboard.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "free_board_comment")
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString(exclude = { "freeBoard", "user", "parent", "children" })
@EntityListeners(AuditingEntityListener.class)
public class FreeBoardComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 1000)
    private String comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id")
    private FreeBoard freeBoard;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private FreeBoardComment parent;

    @Builder.Default
    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<FreeBoardComment> children = new ArrayList<>();

    @Builder.Default
    private Boolean isDeleted = false;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime regDate;

    @LastModifiedDate
    private LocalDateTime modDate;

    public void changeComment(String comment) {
        this.comment = comment;
    }

    public void changeIsDeleted(Boolean isDeleted) {
        this.isDeleted = isDeleted;
    }

    // 대댓글 추가
    public void addChild(FreeBoardComment child) {
        this.children.add(child);
        child.parent = this;
    }

    // 최상위 댓글인지 확인
    public boolean isTopLevel() {
        return this.parent == null;
    }

    // 대댓글인지 확인
    public boolean isReply() {
        return this.parent != null;
    }

    public void updateModifiedDate() {
        this.modDate = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getComment() { return comment; }
    public FreeBoard getFreeBoard() { return freeBoard; }
    public UserEntity getUser() { return user; }
    public FreeBoardComment getParent() { return parent; }
    public List<FreeBoardComment> getChildren() { return children; }
    public Boolean getIsDeleted() { return isDeleted; }
    public LocalDateTime getRegDate() { return regDate; }
    public LocalDateTime getModDate() { return modDate; }

    public static FreeBoardCommentBuilder builder() { return new FreeBoardCommentBuilder(); }

    public static class FreeBoardCommentBuilder {
        private String comment;
        private FreeBoard freeBoard;
        private UserEntity user;
        private FreeBoardComment parent;
        private List<FreeBoardComment> children = new ArrayList<>();
        private Boolean isDeleted = false;

        public FreeBoardCommentBuilder comment(String comment) { this.comment = comment; return this; }
        public FreeBoardCommentBuilder freeBoard(FreeBoard freeBoard) { this.freeBoard = freeBoard; return this; }
        public FreeBoardCommentBuilder user(UserEntity user) { this.user = user; return this; }
        public FreeBoardCommentBuilder parent(FreeBoardComment parent) { this.parent = parent; return this; }
        public FreeBoardCommentBuilder children(List<FreeBoardComment> children) { this.children = children; return this; }
        public FreeBoardCommentBuilder isDeleted(Boolean isDeleted) { this.isDeleted = isDeleted; return this; }

        public FreeBoardComment build() {
            FreeBoardComment c = new FreeBoardComment();
            c.comment = this.comment;
            c.freeBoard = this.freeBoard;
            c.user = this.user;
            c.parent = this.parent;
            c.children = this.children != null ? this.children : new ArrayList<>();
            c.isDeleted = this.isDeleted != null ? this.isDeleted : false;
            return c;
        }
    }
}
