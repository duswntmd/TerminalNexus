package kr.pe.tn.domain.freeboard.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "free_board_file")
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString(exclude = "freeBoard")
public class FreeBoardFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String uuid;

    @Column(nullable = false)
    private String originalName;

    private String path;

    private String type; // IMAGE, VIDEO, YOUTUBE (Deprecated), FILE

    // 유저가 요청한 YouTube URL (있을 경우)
    private String youtubeUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id")
    private FreeBoard freeBoard;

    public void setFreeBoard(FreeBoard freeBoard) {
        this.freeBoard = freeBoard;
    }

    public Long getId() { return id; }
    public String getUuid() { return uuid; }
    public String getOriginalName() { return originalName; }
    public String getPath() { return path; }
    public String getType() { return type; }
    public String getYoutubeUrl() { return youtubeUrl; }
    public FreeBoard getFreeBoard() { return freeBoard; }

    public static FreeBoardFileBuilder builder() { return new FreeBoardFileBuilder(); }

    public static class FreeBoardFileBuilder {
        private String uuid;
        private String originalName;
        private String path;
        private String type;
        private String youtubeUrl;
        private FreeBoard freeBoard;

        public FreeBoardFileBuilder uuid(String uuid) { this.uuid = uuid; return this; }
        public FreeBoardFileBuilder originalName(String originalName) { this.originalName = originalName; return this; }
        public FreeBoardFileBuilder path(String path) { this.path = path; return this; }
        public FreeBoardFileBuilder type(String type) { this.type = type; return this; }
        public FreeBoardFileBuilder youtubeUrl(String youtubeUrl) { this.youtubeUrl = youtubeUrl; return this; }
        public FreeBoardFileBuilder freeBoard(FreeBoard freeBoard) { this.freeBoard = freeBoard; return this; }

        public FreeBoardFile build() {
            FreeBoardFile f = new FreeBoardFile();
            f.uuid = this.uuid;
            f.originalName = this.originalName;
            f.path = this.path;
            f.type = this.type;
            f.youtubeUrl = this.youtubeUrl;
            f.freeBoard = this.freeBoard;
            return f;
        }
    }
}
