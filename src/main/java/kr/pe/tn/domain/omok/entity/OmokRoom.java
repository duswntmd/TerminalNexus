package kr.pe.tn.domain.omok.entity;

import kr.pe.tn.domain.omok.dto.OmokDTO;
import kr.pe.tn.domain.omok.engine.OmokRules;
import lombok.Getter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import static kr.pe.tn.domain.omok.engine.OmokRules.BLACK;
import static kr.pe.tn.domain.omok.engine.OmokRules.CELLS;
import static kr.pe.tn.domain.omok.engine.OmokRules.EMPTY;
import static kr.pe.tn.domain.omok.engine.OmokRules.WHITE;

/**
 * 실시간 오목 대국 방 (메모리 보관, 판 상태의 기준은 서버)
 * 상태를 바꾸는 메서드는 모두 synchronized → 동시에 들어온 수를 순서대로 처리
 * 예외 메시지는 화면에서 번역하는 오류 코드다.
 */
@Getter
public class OmokRoom {

    public enum Status { WAITING, PLAYING, FINISHED }

    private final String roomId = UUID.randomUUID().toString().substring(0, 8);
    private final String title;
    private final String host;
    private final String rule;
    private final int turnSeconds;
    private String black;
    private String white;

    private Status status = Status.WAITING;
    private final int[] board = new int[CELLS];
    private final List<Integer> moves = new ArrayList<>();
    private int turn = BLACK;
    private String winner;
    private String reason;
    private List<Integer> winLine;
    private Integer undoRequest;
    private boolean rematchBlack;
    private boolean rematchWhite;
    private int gameNo;
    private long turnEndsAt;
    private volatile long lastActivity = System.currentTimeMillis();

    public OmokRoom(String title, String host, String side, String rule, Integer turnSeconds) {
        this.title = title;
        this.host = host;
        this.rule = OmokRules.isRule(rule) ? rule : OmokRules.RENJU;
        int sec = turnSeconds == null ? 30 : turnSeconds;
        this.turnSeconds = sec == 15 || sec == 60 ? sec : 30;
        boolean asWhite = "WHITE".equals(side) || ("RANDOM".equals(side) && ThreadLocalRandom.current().nextBoolean());
        if (asWhite) white = host;
        else black = host;
    }

    private static String colorName(int color) {
        return color == BLACK ? "BLACK" : "WHITE";
    }

    /** 닉네임의 색 (대국자가 아니면 null) */
    public Integer sideOf(String nick) {
        if (nick == null) return null;
        if (nick.equals(black)) return BLACK;
        if (nick.equals(white)) return WHITE;
        return null;
    }

    public int playerCount() {
        return (black != null ? 1 : 0) + (white != null ? 1 : 0);
    }

    private void touch() {
        lastActivity = System.currentTimeMillis();
    }

    private void resetClock() {
        turnEndsAt = System.currentTimeMillis() + turnSeconds * 1000L;
    }

    /** 빈 자리에 착석 (이미 대국자거나 대국 중이면 관전) */
    public synchronized void join(String nick) {
        touch();
        if (sideOf(nick) != null || status != Status.WAITING) return;
        if (black == null) black = nick;
        else if (white == null) white = nick;
    }

    public synchronized void start(String nick) {
        if (!host.equals(nick)) throw new IllegalStateException("host_only");
        if (status != Status.WAITING) throw new IllegalStateException("not_waiting");
        if (playerCount() < 2) throw new IllegalStateException("need_opponent");
        begin();
    }

    private void clearGame() {
        Arrays.fill(board, EMPTY);
        moves.clear();
        turn = BLACK;
        winner = null;
        reason = null;
        winLine = null;
        undoRequest = null;
        rematchBlack = false;
        rematchWhite = false;
    }

    private void begin() {
        clearGame();
        gameNo++;
        status = Status.PLAYING;
        resetClock();
        touch();
    }

    /** 착수 검증 후 적용. 빈칸이 아니거나 금수면 거부 */
    public synchronized void move(String nick, Integer cell) {
        requireTurn(nick);
        if (cell == null || cell < 0 || cell >= CELLS || board[cell] != EMPTY) throw new IllegalArgumentException("occupied");
        String forbidden = OmokRules.forbiddenReason(board, cell, turn, rule);
        if (forbidden != null) throw new IllegalArgumentException("forbidden_" + forbidden);
        int mover = turn;
        board[cell] = mover;
        moves.add(cell);
        turn = 3 - mover;
        undoRequest = null; // 상대가 그냥 두면 무르기 요청은 사라진다
        touch();

        List<Integer> line = OmokRules.winLine(board, cell, mover, rule);
        if (line != null) {
            winLine = line;
            finish(colorName(mover), "five");
        } else if (moves.size() >= CELLS || (moves.size() >= CELLS - 30 && !OmokRules.hasLegalMove(board, turn, rule))) {
            finish(null, "full"); // 판이 다 찼거나 남은 자리가 모두 금수
        } else {
            resetClock();
        }
    }

    /** 제한 시간이 지났으면 시간패 처리 @return 상태가 바뀌었으면 true */
    public synchronized boolean expireTurn(long now) {
        if (status != Status.PLAYING || now < turnEndsAt) return false;
        finish(colorName(3 - turn), "timeout");
        return true;
    }

    public synchronized void resign(String nick) {
        Integer side = sideOf(nick);
        if (side == null || status != Status.PLAYING) return;
        finish(colorName(3 - side), "resign");
    }

    /** 무르기 요청: 자기 돌이 판 위에 있을 때만 */
    public synchronized void requestUndo(String nick) {
        Integer side = sideOf(nick);
        if (side == null || status != Status.PLAYING) throw new IllegalStateException("not_playing");
        if (undoRequest != null) throw new IllegalStateException("undo_pending");
        int mine = side == BLACK ? (moves.size() + 1) / 2 : moves.size() / 2;
        if (mine == 0) throw new IllegalStateException("nothing_to_undo");
        undoRequest = side;
        touch();
    }

    /** 무르기 응답: 수락하면 요청한 쪽의 마지막 수까지 되돌리고 그쪽 차례가 된다 */
    public synchronized void answerUndo(String nick, boolean accept) {
        Integer side = sideOf(nick);
        if (side == null || status != Status.PLAYING) throw new IllegalStateException("not_playing");
        if (undoRequest == null || undoRequest == side.intValue()) throw new IllegalStateException("no_undo_request");
        int requester = undoRequest;
        undoRequest = null;
        touch();
        if (!accept) return;
        int count = turn == requester ? 2 : 1;
        for (int i = 0; i < count && !moves.isEmpty(); i++) {
            board[moves.remove(moves.size() - 1)] = EMPTY;
        }
        turn = requester;
        resetClock();
    }

    /** @return 방을 없애야 하면 true (방장 퇴장) */
    public synchronized boolean leave(String nick) {
        Integer side = sideOf(nick);
        if (side == null) return false;
        if (status == Status.PLAYING) finish(colorName(3 - side), "leave");
        if (host.equals(nick)) return true;
        if (side == BLACK) black = null;
        else white = null;
        if (status == Status.FINISHED) {
            status = Status.WAITING;
            clearGame();
        }
        touch();
        return false;
    }

    /** 재대국: 두 사람이 모두 누르면 흑백을 바꿔 바로 새 판을 시작한다 */
    public synchronized void rematch(String nick) {
        Integer side = sideOf(nick);
        if (side == null) throw new IllegalStateException("not_player");
        if (status != Status.FINISHED) throw new IllegalStateException("not_finished");
        if (side == BLACK) rematchBlack = true;
        else rematchWhite = true;
        touch();
        if (rematchBlack && rematchWhite) {
            String tmp = black;
            black = white;
            white = tmp;
            begin();
        }
    }

    private void requireTurn(String nick) {
        if (status != Status.PLAYING) throw new IllegalStateException("not_playing");
        Integer side = sideOf(nick);
        if (side == null) throw new IllegalStateException("not_player");
        if (side != turn) throw new IllegalStateException("not_your_turn");
    }

    private void finish(String winner, String reason) {
        this.status = Status.FINISHED;
        this.winner = winner;
        this.reason = reason;
        this.undoRequest = null;
        touch();
    }

    public synchronized OmokDTO.RoomState toState() {
        List<String> votes = new ArrayList<>();
        if (rematchBlack) votes.add("BLACK");
        if (rematchWhite) votes.add("WHITE");
        return OmokDTO.RoomState.builder()
                .roomId(roomId).title(title).host(host).black(black).white(white)
                .status(status.name()).rule(rule).turnSeconds(turnSeconds).gameNo(gameNo)
                .moves(new ArrayList<>(moves))
                .turn(colorName(turn))
                .winner(winner).reason(reason)
                .winLine(winLine != null ? new ArrayList<>(winLine) : null)
                .undoRequest(undoRequest != null ? colorName(undoRequest) : null)
                .rematch(votes)
                .turnEndsAt(status == Status.PLAYING ? turnEndsAt : null)
                .serverTime(System.currentTimeMillis())
                .build();
    }

    public synchronized OmokDTO.RoomSummary toSummary() {
        return OmokDTO.RoomSummary.builder()
                .roomId(roomId).title(title).host(host).black(black).white(white)
                .status(status.name()).rule(rule).turnSeconds(turnSeconds).playerCount(playerCount())
                .build();
    }
}
