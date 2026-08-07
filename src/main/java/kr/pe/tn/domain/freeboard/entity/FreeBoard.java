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

    @Builder.Default
    private Long dislikeCount = 0L;

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

    // 싫어요 OneToMany (Optional, for cascade delete)
    @Builder.Default
    @OneToMany(mappedBy = "freeBoard", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FreeBoardDislike> dislikes = new ArrayList<>();

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
        if (this.likeCount == null) {
            this.likeCount = 0L;
        }
        this.likeCount = this.likeCount + delta;
    }

    public void updateDislikeCount(int delta) {
        if (this.dislikeCount == null) {
            this.dislikeCount = 0L;
        }
        this.dislikeCount = this.dislikeCount + delta;
    }

    public void updateModifiedDate() {
        this.modDate = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public UserEntity getUser() { return user; }
    public Long getViewCount() { return viewCount; }
    public Boolean getIsDeleted() { return isDeleted; }
    public LocalDateTime getRegDate() { return regDate; }
    public LocalDateTime getModDate() { return modDate; }
    public Long getLikeCount() { return likeCount; }
    public Long getDislikeCount() { return dislikeCount; }
    public List<FreeBoardComment> getComments() { return comments; }
    public List<FreeBoardFile> getFiles() { return files; }
    public List<FreeBoardLike> getLikes() { return likes; }
    public List<FreeBoardDislike> getDislikes() { return dislikes; }

    public static FreeBoardBuilder builder() { return new FreeBoardBuilder(); }

    public static class FreeBoardBuilder {
        private String title;
        private String content;
        private UserEntity user;
        private Long viewCount = 0L;
        private Boolean isDeleted = false;
        private Long likeCount = 0L;
        private Long dislikeCount = 0L;
        private List<FreeBoardComment> comments = new ArrayList<>();
        private List<FreeBoardFile> files = new ArrayList<>();

        public FreeBoardBuilder title(String title) { this.title = title; return this; }
        public FreeBoardBuilder content(String content) { this.content = content; return this; }
        public FreeBoardBuilder user(UserEntity user) { this.user = user; return this; }
        public FreeBoardBuilder viewCount(Long viewCount) { this.viewCount = viewCount; return this; }
        public FreeBoardBuilder isDeleted(Boolean isDeleted) { this.isDeleted = isDeleted; return this; }
        public FreeBoardBuilder likeCount(Long likeCount) { this.likeCount = likeCount; return this; }
        public FreeBoardBuilder dislikeCount(Long dislikeCount) { this.dislikeCount = dislikeCount; return this; }
        public FreeBoardBuilder comments(List<FreeBoardComment> comments) { this.comments = comments; return this; }
        public FreeBoardBuilder files(List<FreeBoardFile> files) { this.files = files; return this; }

        public FreeBoard build() {
            FreeBoard f = new FreeBoard();
            f.title = this.title;
            f.content = this.content;
            f.user = this.user;
            f.viewCount = this.viewCount != null ? this.viewCount : 0L;
            f.isDeleted = this.isDeleted != null ? this.isDeleted : false;
            f.likeCount = this.likeCount != null ? this.likeCount : 0L;
            f.dislikeCount = this.dislikeCount != null ? this.dislikeCount : 0L;
            f.comments = this.comments != null ? this.comments : new ArrayList<>();
            f.files = this.files != null ? this.files : new ArrayList<>();
            return f;
        }
    }
}
