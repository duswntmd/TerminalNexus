package kr.pe.tn.domain.seotda.entity;

import kr.pe.tn.domain.seotda.dto.SeotdaDTO;
import kr.pe.tn.domain.seotda.engine.SeotdaHand;
import kr.pe.tn.domain.seotda.engine.SeotdaRules;
import lombok.Getter;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * 실시간 섯다 방 (메모리 보관, 판 상태와 패의 기준은 서버)
 * 상태를 바꾸는 메서드는 모두 synchronized. 예외 메시지는 화면에서 번역하는 오류 코드다.
 * 포인트는 이 방에서만 쓰는 가상 포인트로, 들어올 때 10,000P를 받고 기본 판돈보다 적어지면 다시 채운다.
 */
@Getter
public class SeotdaRoom {

    public enum Status { WAITING, PLAYING, FINISHED }

    public static final int MAX_PLAYERS = 4;
    public static final int START_POINTS = 10_000;
    public static final int ANTE = 100;
    public static final long TURN_LIMIT_MS = 45_000L;

    private static final SecureRandom RANDOM = new SecureRandom();

    /** 자리 (판이 진행 중이면 순서가 바뀌지 않는다) */
    @Getter
    public static class Seat {
        private final String nick;
        private int chips = START_POINTS;

        Seat(String nick) {
            this.nick = nick;
        }
    }

    private final String roomId = UUID.randomUUID().toString().substring(0, 8);
    private final String title;
    private final String host;
    private final List<Seat> seats = new ArrayList<>();
    private final Set<String> leaving = new HashSet<>(); // 판 도중 나간 사람 (판이 끝나면 자리 정리)

    private Status status = Status.WAITING;
    private SeotdaHand hand;
    private int handNo;
    private int dealer;
    private int carry;
    private long turnStartedAt;
    private volatile long lastActivity = System.currentTimeMillis();

    public SeotdaRoom(String title, String host) {
        this.title = title;
        this.host = host;
        seats.add(new Seat(host));
    }

    private void touch() {
        lastActivity = System.currentTimeMillis();
    }

    public int seatOf(String nick) {
        for (int i = 0; i < seats.size(); i++) if (seats.get(i).nick.equals(nick)) return i;
        return -1;
    }

    /** 빈 자리에 앉음. 판이 진행 중이거나 가득 차면 관전 */
    public synchronized void join(String nick) {
        touch();
        if (seatOf(nick) >= 0 || status == Status.PLAYING || seats.size() >= MAX_PLAYERS) return;
        seats.add(new Seat(nick));
    }

    public synchronized void start(String nick) {
        if (!host.equals(nick)) throw new IllegalStateException("host_only");
        if (status == Status.PLAYING) throw new IllegalStateException("already_playing");
        if (seats.size() < 2) throw new IllegalStateException("need_players");
        for (Seat s : seats) if (s.chips < ANTE) s.chips = START_POINTS;
        int[] deck = new int[SeotdaRules.CARD_COUNT];
        for (int i = 0; i < deck.length; i++) deck[i] = i;
        for (int i = deck.length - 1; i > 0; i--) {
            int j = RANDOM.nextInt(i + 1);
            int t = deck[i];
            deck[i] = deck[j];
            deck[j] = t;
        }
        dealer = Math.floorMod(dealer, seats.size());
        hand = new SeotdaHand(seats.stream().map(s -> s.chips).toList(), dealer, ANTE, carry, deck);
        carry = 0;
        handNo++;
        status = Status.PLAYING;
        turnStartedAt = System.currentTimeMillis();
        touch();
    }

    /** 베팅. 금액은 서버가 계산하고 할 수 없는 행동은 거부 */
    public synchronized void bet(String nick, String type) {
        if (status != Status.PLAYING) throw new IllegalStateException("not_playing");
        int seat = seatOf(nick);
        if (seat < 0 || leaving.contains(nick)) throw new IllegalStateException("not_player");
        if (hand.getTurn() != seat) throw new IllegalStateException("not_your_turn");
        if (type == null || !SeotdaHand.ACTIONS.contains(type)) throw new IllegalArgumentException("illegal_action");
        hand.apply(seat, type);
        afterChange();
    }

    /** 차례 제한 시간이 지나면 다이 처리. @return 바뀌었으면 true */
    public synchronized boolean expireTurn(long now) {
        if (status != Status.PLAYING || now - turnStartedAt < TURN_LIMIT_MS) return false;
        hand.forceFold(hand.getTurn());
        afterChange();
        return true;
    }

    private void afterChange() {
        turnStartedAt = System.currentTimeMillis();
        touch();
        if (!hand.isDone()) return;
        for (int i = 0; i < seats.size(); i++) seats.get(i).chips = hand.getPlayers().get(i).getChips();
        dealer = hand.getOutcome().nextDealer();
        carry = hand.getOutcome().carry();
        status = Status.FINISHED;
        if (!leaving.isEmpty()) {
            for (String nick : List.copyOf(leaving)) removeSeat(nick);
            leaving.clear();
        }
    }

    private void removeSeat(String nick) {
        int seat = seatOf(nick);
        if (seat < 0) return;
        seats.remove(seat);
        if (seat < dealer) dealer--;
        if (dealer >= seats.size()) dealer = 0;
        // 자리 번호가 바뀌었으므로 지난 판 결과는 지운다
        if (status != Status.PLAYING) {
            hand = null;
            status = Status.WAITING;
        }
    }

    /** @return 방을 없애야 하면 true (방장 퇴장) */
    public synchronized boolean leave(String nick) {
        int seat = seatOf(nick);
        if (seat < 0) return false;
        if (host.equals(nick)) return true;
        if (status == Status.PLAYING) {
            leaving.add(nick);
            hand.forceFold(seat);
            afterChange();
        } else {
            removeSeat(nick);
        }
        touch();
        return false;
    }

    public synchronized List<String> handPlayers() {
        return hand == null ? List.of() : seats.stream().map(Seat::getNick).toList();
    }

    public synchronized List<Integer> cardsOf(String nick) {
        int seat = seatOf(nick);
        if (hand == null || seat < 0 || seat >= hand.getPlayers().size()) return null;
        int[] c = hand.getPlayers().get(seat).getCards();
        return List.of(c[0], c[1]);
    }

    /** 공개 상태. viewer 가 이번 판 참가자면 myCards 에 그 사람의 패를 넣는다 (null 이면 넣지 않음) */
    public synchronized SeotdaDTO.RoomState toState(String viewer) {
        List<SeotdaDTO.SeatState> seatStates = new ArrayList<>();
        SeotdaHand.Outcome out = hand != null ? hand.getOutcome() : null;
        for (int i = 0; i < seats.size(); i++) {
            Seat s = seats.get(i);
            SeotdaDTO.SeatState.SeatStateBuilder b = SeotdaDTO.SeatState.builder().nick(s.nick).chips(s.chips);
            if (hand != null && i < hand.getPlayers().size()) {
                SeotdaHand.Player p = hand.getPlayers().get(i);
                b.chips(p.getChips()).contrib(p.getContrib()).inHand(true).folded(p.isFolded()).raised(p.isRaised()).last(p.getLast());
                if (out != null && out.reveal().contains(i)) b.cards(List.of(p.getCards()[0], p.getCards()[1]));
            }
            seatStates.add(b.build());
        }
        SeotdaDTO.RoomState.RoomStateBuilder st = SeotdaDTO.RoomState.builder()
                .roomId(roomId).title(title).host(host).status(status.name()).handNo(handNo)
                .ante(ANTE).dealer(dealer).carry(carry).turn(-1).seats(seatStates).log(List.of());
        if (hand != null) {
            st.cap(hand.getCap()).level(hand.getLevel()).pot(hand.getPot()).dealer(hand.getDealer()).turn(hand.getTurn())
                    .log(hand.getLog().stream().map(l -> SeotdaDTO.LogEntry.builder().seat(l.seat()).type(l.type()).pay(l.pay()).build()).toList());
            if (status == Status.PLAYING) st.turnEndsAt(turnStartedAt + TURN_LIMIT_MS);
            if (out != null) {
                st.result(SeotdaDTO.Result.builder().type(out.type()).winners(out.winners())
                        .payouts(Map.copyOf(out.payouts())).reveal(out.reveal()).redoSeat(out.redoSeat()).build());
            }
            if (viewer != null) st.myCards(cardsOf(viewer));
        }
        return st.build();
    }

    public synchronized SeotdaDTO.RoomSummary toSummary() {
        return SeotdaDTO.RoomSummary.builder()
                .roomId(roomId).title(title).host(host).status(status.name())
                .players(seats.stream().map(Seat::getNick).toList())
                .build();
    }
}
