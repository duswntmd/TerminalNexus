package kr.pe.tn.domain.janggi.entity;

import kr.pe.tn.domain.janggi.dto.JanggiDTO;
import kr.pe.tn.domain.janggi.engine.JanggiEngine;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static kr.pe.tn.domain.janggi.engine.JanggiEngine.CHO;
import static kr.pe.tn.domain.janggi.engine.JanggiEngine.HAN;
import static kr.pe.tn.domain.janggi.engine.JanggiEngine.PASS;

/**
 * 실시간 장기 대국 방 (메모리 보관, 판 상태의 기준은 서버)
 * 상태를 바꾸는 메서드는 모두 synchronized → 동시에 들어온 수를 순서대로 처리
 */
@Getter
public class JanggiRoom {

    public enum Status { WAITING, PLAYING, FINISHED }

    private final String roomId = UUID.randomUUID().toString().substring(0, 8);
    private final String title;
    private final String host;
    private String cho;
    private String han;
    private String choFormation = "N_E_N_E";
    private String hanFormation = "N_E_N_E";

    private Status status = Status.WAITING;
    private int[] board;
    private int turn = CHO;
    private final List<int[]> moves = new ArrayList<>();
    private boolean bikjang;
    private String winner;
    private String reason;
    private volatile long lastActivity = System.currentTimeMillis();

    public JanggiRoom(String title, String host, String side, String formation) {
        this.title = title;
        this.host = host;
        if ("HAN".equals(side)) {
            this.han = host;
            if (JanggiEngine.isValidFormation(formation)) this.hanFormation = formation;
        } else {
            this.cho = host;
            if (JanggiEngine.isValidFormation(formation)) this.choFormation = formation;
        }
    }

    /** 닉네임의 진영 (대국자가 아니면 null) */
    public Integer sideOf(String nick) {
        if (nick == null) return null;
        if (nick.equals(cho)) return CHO;
        if (nick.equals(han)) return HAN;
        return null;
    }

    public int playerCount() {
        return (cho != null ? 1 : 0) + (han != null ? 1 : 0);
    }

    private void touch() {
        lastActivity = System.currentTimeMillis();
    }

    /** 빈 자리에 착석 (이미 대국자면 그대로) */
    public synchronized void join(String nick) {
        touch();
        if (sideOf(nick) != null || status != Status.WAITING) return;
        if (cho == null) cho = nick;
        else if (han == null) han = nick;
    }

    public synchronized void setFormation(String nick, String formation) {
        Integer side = sideOf(nick);
        if (side == null) throw new IllegalStateException("대국자만 상차림을 고를 수 있습니다.");
        if (status != Status.WAITING) throw new IllegalStateException("대국 시작 전에만 상차림을 바꿀 수 있습니다.");
        if (!JanggiEngine.isValidFormation(formation)) throw new IllegalArgumentException("알 수 없는 상차림입니다.");
        if (side == CHO) choFormation = formation;
        else hanFormation = formation;
        touch();
    }

    public synchronized void start(String nick) {
        if (!host.equals(nick)) throw new IllegalStateException("방장만 대국을 시작할 수 있습니다.");
        if (status != Status.WAITING) throw new IllegalStateException("이미 진행 중이거나 끝난 대국입니다.");
        if (playerCount() < 2) throw new IllegalStateException("상대가 입장해야 시작할 수 있습니다.");
        board = JanggiEngine.createBoard(choFormation, hanFormation);
        turn = CHO;
        moves.clear();
        bikjang = false;
        winner = null;
        reason = null;
        status = Status.PLAYING;
        touch();
    }

    public synchronized void move(String nick, int from, int to) {
        requireTurn(nick);
        if (!JanggiEngine.isLegal(board, turn, from, to)) throw new IllegalArgumentException("둘 수 없는 수입니다.");
        play(from, to);
    }

    public synchronized void pass(String nick) {
        requireTurn(nick);
        if (JanggiEngine.inCheck(board, turn)) throw new IllegalArgumentException("장군 상태에서는 한수쉼을 할 수 없습니다.");
        play(PASS, PASS);
    }

    public synchronized void resign(String nick) {
        Integer side = sideOf(nick);
        if (side == null || status != Status.PLAYING) return;
        finish(JanggiEngine.teamName(JanggiEngine.enemyOf(side)), "기권승");
    }

    /** @return 방을 없애야 하면 true (방장 퇴장) */
    public synchronized boolean leave(String nick) {
        Integer side = sideOf(nick);
        if (side == null) return false;
        if (status == Status.PLAYING) {
            finish(JanggiEngine.teamName(JanggiEngine.enemyOf(side)), "상대 퇴장 · 기권승");
        }
        if (host.equals(nick)) return true;
        if (side == CHO) cho = null;
        else han = null;
        if (status == Status.FINISHED) resetToWaiting();
        touch();
        return false;
    }

    public synchronized void rematch(String nick) {
        if (!host.equals(nick)) throw new IllegalStateException("방장만 새 대국을 열 수 있습니다.");
        if (status != Status.FINISHED) throw new IllegalStateException("대국이 끝난 뒤에만 가능합니다.");
        // 공평하게 진영 교체
        String tmp = cho;
        cho = han;
        han = tmp;
        String tf = choFormation;
        choFormation = hanFormation;
        hanFormation = tf;
        resetToWaiting();
    }

    private void resetToWaiting() {
        status = Status.WAITING;
        board = null;
        moves.clear();
        turn = CHO;
        bikjang = false;
        winner = null;
        reason = null;
        touch();
    }

    private void requireTurn(String nick) {
        if (status != Status.PLAYING) throw new IllegalStateException("진행 중인 대국이 아닙니다.");
        Integer side = sideOf(nick);
        if (side == null) throw new IllegalStateException("대국자가 아닙니다.");
        if (side != turn) throw new IllegalStateException("상대 차례입니다.");
    }

    /** 프론트 engine.playMove 와 동일한 종료 판정 */
    private void play(int from, int to) {
        int mover = turn;
        int opp = JanggiEngine.enemyOf(mover);
        int[] prev = moves.isEmpty() ? null : moves.get(moves.size() - 1);
        boolean prevBikjang = bikjang;

        board = JanggiEngine.applyToBoard(board, from, to);
        moves.add(new int[]{from, to});
        turn = opp;
        bikjang = false;
        touch();

        if (from == PASS && prev != null && prev[0] == PASS) {
            finish(JanggiEngine.scoreWinner(board), "양측 한수쉼 · 점수 판정");
            return;
        }
        boolean facing = JanggiEngine.kingsFacing(board);
        if (facing && prevBikjang) {
            finish(JanggiEngine.scoreWinner(board), "빅장 · 점수 판정");
            return;
        }
        if (facing) bikjang = true;

        if (JanggiEngine.inCheck(board, opp) && !JanggiEngine.hasAnyLegalMove(board, opp)) {
            finish(JanggiEngine.teamName(mover), "외통 승");
            return;
        }
        if (moves.size() >= JanggiEngine.MAX_PLIES) {
            finish(JanggiEngine.scoreWinner(board), JanggiEngine.MAX_PLIES + "수 도달 · 점수 판정");
        }
    }

    private void finish(String winner, String reason) {
        this.status = Status.FINISHED;
        this.winner = winner;
        this.reason = reason;
        touch();
    }

    public synchronized JanggiDTO.RoomState toState() {
        int[] b = board != null ? board : JanggiEngine.createBoard(choFormation, hanFormation);
        double[] sc = JanggiEngine.scores(b);
        String check = null;
        if (status == Status.PLAYING && JanggiEngine.inCheck(b, turn)) check = JanggiEngine.teamName(turn);
        return JanggiDTO.RoomState.builder()
                .roomId(roomId).title(title).host(host).cho(cho).han(han)
                .choFormation(choFormation).hanFormation(hanFormation)
                .status(status.name()).turn(JanggiEngine.teamName(turn))
                .moves(new ArrayList<>(moves))
                .winner(winner).reason(reason).bikjang(bikjang).inCheck(check)
                .choScore(sc[0]).hanScore(sc[1])
                .build();
    }

    public synchronized JanggiDTO.RoomSummary toSummary() {
        return JanggiDTO.RoomSummary.builder()
                .roomId(roomId).title(title).host(host).cho(cho).han(han)
                .status(status.name()).playerCount(playerCount())
                .build();
    }
}
