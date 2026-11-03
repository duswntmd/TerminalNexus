package kr.pe.tn.domain.chess.entity;

import kr.pe.tn.domain.chess.dto.ChessDTO;
import kr.pe.tn.domain.chess.engine.ChessPosition;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import static kr.pe.tn.domain.chess.engine.ChessPosition.BLACK;
import static kr.pe.tn.domain.chess.engine.ChessPosition.WHITE;

/**
 * 실시간 체스 대국 방 (메모리 보관, 판 상태의 기준은 서버)
 * 상태를 바꾸는 메서드는 모두 synchronized → 동시에 들어온 수를 순서대로 처리
 * 예외 메시지는 화면에서 번역하는 오류 코드다.
 */
@Getter
public class ChessRoom {

    public enum Status { WAITING, PLAYING, FINISHED }

    private final String roomId = UUID.randomUUID().toString().substring(0, 8);
    private final String title;
    private final String host;
    private String white;
    private String black;

    private Status status = Status.WAITING;
    private ChessPosition position;
    private final List<String> moves = new ArrayList<>();
    private final List<String> keys = new ArrayList<>(); // 3회 동일 국면 판정용
    private String winner;
    private String reason;
    private Integer drawOffer;
    private volatile long lastActivity = System.currentTimeMillis();

    public ChessRoom(String title, String host, String side) {
        this.title = title;
        this.host = host;
        boolean asBlack = "BLACK".equals(side) || ("RANDOM".equals(side) && ThreadLocalRandom.current().nextBoolean());
        if (asBlack) black = host;
        else white = host;
    }

    private static String colorName(int color) {
        return color == WHITE ? "WHITE" : "BLACK";
    }

    /** 닉네임의 색 (대국자가 아니면 null) */
    public Integer sideOf(String nick) {
        if (nick == null) return null;
        if (nick.equals(white)) return WHITE;
        if (nick.equals(black)) return BLACK;
        return null;
    }

    public int playerCount() {
        return (white != null ? 1 : 0) + (black != null ? 1 : 0);
    }

    private void touch() {
        lastActivity = System.currentTimeMillis();
    }

    /** 빈 자리에 착석 (이미 대국자거나 대국 중이면 관전) */
    public synchronized void join(String nick) {
        touch();
        if (sideOf(nick) != null || status != Status.WAITING) return;
        if (white == null) white = nick;
        else if (black == null) black = nick;
    }

    public synchronized void start(String nick) {
        if (!host.equals(nick)) throw new IllegalStateException("host_only");
        if (status != Status.WAITING) throw new IllegalStateException("not_waiting");
        if (playerCount() < 2) throw new IllegalStateException("need_opponent");
        position = ChessPosition.fromFen(ChessPosition.START_FEN);
        moves.clear();
        keys.clear();
        keys.add(position.repetitionKey());
        winner = null;
        reason = null;
        drawOffer = null;
        status = Status.PLAYING;
        touch();
    }

    /** 수 검증 후 적용. 합법수 목록에 없는 수(조작된 수 포함)는 거부 */
    public synchronized void move(String nick, String uci) {
        requireTurn(nick);
        Integer m = position.findLegal(uci);
        if (m == null) throw new IllegalArgumentException("illegal_move");
        int mover = position.getTurn();
        position.make(m);
        moves.add(uci);
        String key = position.repetitionKey();
        keys.add(key);
        drawOffer = null;
        touch();

        // 프론트 engine.js 의 outcome 과 같은 순서로 판정
        if (position.legalMoves().isEmpty()) {
            if (position.inCheck()) finish(colorName(mover), "checkmate");
            else finish(null, "stalemate");
        } else if (position.insufficientMaterial()) {
            finish(null, "insufficient");
        } else if (position.getHalfmove() >= 100) {
            finish(null, "fifty");
        } else if (keys.stream().filter(key::equals).count() >= 3) {
            finish(null, "threefold");
        }
    }

    public synchronized void resign(String nick) {
        Integer side = sideOf(nick);
        if (side == null || status != Status.PLAYING) return;
        finish(colorName(side ^ 24), "resign");
    }

    public synchronized void offerDraw(String nick) {
        Integer side = sideOf(nick);
        if (side == null || status != Status.PLAYING) throw new IllegalStateException("not_playing");
        if (drawOffer != null && drawOffer != side.intValue()) {
            finish(null, "agreement"); // 서로 제안하면 성립
            return;
        }
        drawOffer = side;
        touch();
    }

    public synchronized void answerDraw(String nick, boolean accept) {
        Integer side = sideOf(nick);
        if (side == null || status != Status.PLAYING) throw new IllegalStateException("not_playing");
        if (drawOffer == null || drawOffer == side.intValue()) throw new IllegalStateException("no_draw_offer");
        if (accept) finish(null, "agreement");
        else drawOffer = null;
        touch();
    }

    /** @return 방을 없애야 하면 true (방장 퇴장) */
    public synchronized boolean leave(String nick) {
        Integer side = sideOf(nick);
        if (side == null) return false;
        if (status == Status.PLAYING) finish(colorName(side ^ 24), "leave");
        if (host.equals(nick)) return true;
        if (side == WHITE) white = null;
        else black = null;
        if (status == Status.FINISHED) resetToWaiting();
        touch();
        return false;
    }

    public synchronized void rematch(String nick) {
        if (!host.equals(nick)) throw new IllegalStateException("host_only");
        if (status != Status.FINISHED) throw new IllegalStateException("not_finished");
        // 공평하게 색 교체
        String tmp = white;
        white = black;
        black = tmp;
        resetToWaiting();
    }

    private void resetToWaiting() {
        status = Status.WAITING;
        position = null;
        moves.clear();
        keys.clear();
        winner = null;
        reason = null;
        drawOffer = null;
        touch();
    }

    private void requireTurn(String nick) {
        if (status != Status.PLAYING) throw new IllegalStateException("not_playing");
        Integer side = sideOf(nick);
        if (side == null) throw new IllegalStateException("not_player");
        if (side != position.getTurn()) throw new IllegalStateException("not_your_turn");
    }

    private void finish(String winner, String reason) {
        this.status = Status.FINISHED;
        this.winner = winner;
        this.reason = reason;
        this.drawOffer = null;
        touch();
    }

    public synchronized ChessDTO.RoomState toState() {
        return ChessDTO.RoomState.builder()
                .roomId(roomId).title(title).host(host).white(white).black(black)
                .status(status.name())
                .startFen(ChessPosition.START_FEN)
                .moves(new ArrayList<>(moves))
                .turn(colorName(position != null ? position.getTurn() : WHITE))
                .inCheck(status == Status.PLAYING && position.inCheck())
                .winner(winner).reason(reason)
                .drawOffer(drawOffer != null ? colorName(drawOffer) : null)
                .build();
    }

    public synchronized ChessDTO.RoomSummary toSummary() {
        return ChessDTO.RoomSummary.builder()
                .roomId(roomId).title(title).host(host).white(white).black(black)
                .status(status.name()).playerCount(playerCount())
                .build();
    }
}
