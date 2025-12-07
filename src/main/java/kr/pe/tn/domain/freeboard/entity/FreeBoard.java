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
@Table(name = "free_board")
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString(exclude = { "user", "comments", "files" })
@EntityListeners(AuditingEntityListener.class)
public class FreeBoard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @Builder.Default
    private Long viewCount = 0L;

    @Builder.Default
    private Boolean isDeleted = false;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime regDate;

    @LastModifiedDate
    private LocalDateTime modDate;

    @Builder.Default
    private Long likeCount = 0L;

    // 댓글 OneToMany
    @Builder.Default
    @OneToMany(mappedBy = "freeBoard", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FreeBoardComment> comments = new ArrayList<>();

    // 파일 OneToMany
    @Builder.Default
    @OneToMany(mappedBy = "freeBoard", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FreeBoardFile> files = new ArrayList<>();

    // 좋아요 OneToMany (Optional, for cascade delete)
    @Builder.Default
    @OneToMany(mappedBy = "freeBoard", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FreeBoardLike> likes = new ArrayList<>();

    public void changeTitle(String title) {
        this.title = title;
    }

    public void changeContent(String content) {
        this.content = content;
    }

    public void changeIsDeleted(Boolean isDeleted) {
        this.isDeleted = isDeleted;
    }

    public void increaseViewCount() {
        this.viewCount++;
    }

    public void addFile(FreeBoardFile file) {
        this.files.add(file);
    }

    public void updateLikeCount(int delta) {
        this.likeCount = this.likeCount + delta;
    }
}
