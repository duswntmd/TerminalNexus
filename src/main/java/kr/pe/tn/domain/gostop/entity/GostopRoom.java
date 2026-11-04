package kr.pe.tn.domain.gostop.entity;

import kr.pe.tn.domain.gostop.dto.GostopDTO;
import kr.pe.tn.domain.gostop.engine.GostopGame;
import lombok.Getter;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 온라인 맞고 방 (메모리 보관, 패는 서버만 안다).
 * 자리 0은 방장, 자리 1은 상대. 관전은 받지 않는다(패를 가리기 위해 대국자에게만 각자 상태를 보낸다).
 * 상태를 바꾸는 메서드는 모두 synchronized. 예외 메시지는 화면에서 번역하는 오류 코드다.
 */
@Getter
public class GostopRoom {

    public enum Status { WAITING, PLAYING, FINISHED }

    private final String roomId = UUID.randomUUID().toString().substring(0, 8);
    private final String title;
    private final String host;
    private final String[] players = new String[2];
    private Status status = Status.WAITING;
    private GostopGame game;
    private Map<String, Object> settlement;
    private final int[] totals = new int[2]; // 방 누적 점수
    private int nextFirst = -1;
    private int nextCarry = 1;
    private long seq;
    private volatile long lastActivity = System.currentTimeMillis();

    public GostopRoom(String title, String host) {
        this.title = title;
        this.host = host;
        players[0] = host;
    }

    private void touch() {
        lastActivity = System.currentTimeMillis();
        seq++;
    }

    public int seatOf(String nick) {
        if (nick == null) return -1;
        if (nick.equals(players[0])) return 0;
        if (nick.equals(players[1])) return 1;
        return -1;
    }

    public int playerCount() {
        return (players[0] != null ? 1 : 0) + (players[1] != null ? 1 : 0);
    }

    public List<String> playerList() {
        List<String> list = new ArrayList<>();
        for (String p : players) if (p != null) list.add(p);
        return list;
    }

    public synchronized void join(String nick) {
        if (seatOf(nick) >= 0) return;
        if (players[1] != null || status != Status.WAITING) throw new IllegalStateException("room_full");
        players[1] = nick;
        touch();
    }

    public synchronized void start(String nick) {
        if (!host.equals(nick)) throw new IllegalStateException("host_only");
        if (status == Status.PLAYING) throw new IllegalStateException("not_waiting");
        if (playerCount() < 2) throw new IllegalStateException("need_opponent");
        int first = nextFirst >= 0 ? nextFirst : ThreadLocalRandom.current().nextInt(2);
        game = GostopGame.newGame(first, nextCarry);
        settlement = null;
        status = Status.PLAYING;
        touch();
        if (game.isEnded()) finishGame(); // 총통
    }

    /** 대국 행동. 차례·합법성은 엔진이 검증 */
    public synchronized void act(String nick, GostopGame.Action action) {
        if (status != Status.PLAYING || game == null) throw new IllegalStateException("not_playing");
        int seat = seatOf(nick);
        if (seat < 0) throw new IllegalStateException("not_player");
        if ("gukjin".equals(action.type())) {
            game.setGukjin(seat, action.value());
            touch();
            return;
        }
        if (game.getTurn() != seat) throw new IllegalStateException("not_your_turn");
        game.apply(action);
        touch();
        if (game.isEnded()) finishGame();
    }

    private void finishGame() {
        settlement = game.settle();
        Integer w = game.getResultWinner();
        if (w != null) totals[w] += (Integer) settlement.get("final");
        nextFirst = w != null ? w : game.getFirst();
        nextCarry = Math.min((Integer) settlement.get("nextCarry"), 8);
        status = Status.FINISHED;
    }

    /** @return 방을 없애야 하면 true (방장 퇴장) */
    public synchronized boolean leave(String nick) {
        int seat = seatOf(nick);
        if (seat < 0) return false;
        if (status == Status.PLAYING) {
            game.forfeit(seat);
            settlement = game.settle();
            nextCarry = 1;
            status = Status.FINISHED;
        }
        if (host.equals(nick)) return true;
        players[1] = null;
        totals[0] = 0;
        totals[1] = 0;
        nextFirst = -1;
        nextCarry = 1;
        status = Status.WAITING;
        game = null;
        settlement = null;
        touch();
        return false;
    }

    /** seat 시점 방 상태 (상대 손패·덱은 가림) */
    public synchronized GostopDTO.RoomState toState(String nick) {
        int seat = seatOf(nick);
        return GostopDTO.RoomState.builder()
                .roomId(roomId).title(title).host(host)
                .players(Arrays.asList(players.clone()))
                .status(status.name())
                .seat(seat)
                .seq(seq)
                .totals(totals.clone())
                .carry(nextCarry)
                .game(game != null ? game.viewFor(seat) : null)
                .settlement(settlement)
                .build();
    }

    public synchronized GostopDTO.RoomSummary toSummary() {
        return GostopDTO.RoomSummary.builder()
                .roomId(roomId).title(title).host(host)
                .players(Arrays.asList(players.clone()))
                .status(status.name()).playerCount(playerCount())
                .build();
    }
}
