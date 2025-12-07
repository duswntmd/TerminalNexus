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

    private String type; // IMAGE, VIDEO, ETC

    // 유저가 요청한 YouTube URL (있을 경우)
    private String youtubeUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id")
    private FreeBoard freeBoard;

    public void setFreeBoard(FreeBoard freeBoard) {
        this.freeBoard = freeBoard;
    }
}
