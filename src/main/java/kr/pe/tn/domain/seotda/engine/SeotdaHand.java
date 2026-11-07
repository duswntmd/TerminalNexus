package kr.pe.tn.domain.seotda.engine;

import lombok.Getter;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 섯다 한 판 진행 (프론트 engine.js 의 newHand·legalActions·applyAction 과 같은 규칙,
 * 규칙 문서: frontend/src/pages/play/seotda/RULES.md)
 * - 2장 섯다: 1장 → 1구 베팅 → 1장 → 2구 베팅 → 공개
 * - 3장 섯다: 2장 → 공개할 1장 고르기 → 1구 → 1장 → 2구 → 3장 중 2장 고르기 → 공개
 * - 재경기: 학교 없이 이월된 판돈으로 참가자만 2장 방식
 * 금액은 서버가 계산하고 클라이언트는 행동 종류만 보낸다. 할 수 없는 행동은 IllegalArgumentException("illegal_action")
 */
@Getter
public class SeotdaHand {

    public static final List<String> ACTIONS = List.of("die", "check", "call", "bbing", "ddadang", "quarter", "half");
    private static final List<String> RAISES = List.of("bbing", "ddadang", "quarter", "half");
    public static final int[][] PAIRS_OF_THREE = {{0, 1}, {0, 2}, {1, 2}};

    @Getter
    public static class Player {
        private int chips;
        private int contrib;
        private final List<Integer> cards = new ArrayList<>();
        private final boolean inHand;
        private boolean folded;
        private boolean acted;
        private boolean canRaise = true;
        private String last;
        private Integer open;  // 3장: 공개한 패의 위치
        private int[] pick;    // 3장: 승부에 쓸 2장의 위치

        Player(int chips, boolean inHand) {
            this.chips = chips;
            this.inHand = inHand;
        }

        public boolean isLive() {
            return inHand && !folded;
        }
    }

    public record Act(String type, int pay) {
    }

    public record LogEntry(int seat, String type, int pay) {
    }

    /** type: fold, showdown, redo / reason: fold, showdown, tie, gusa, mgusa */
    public record Outcome(String type, String reason, List<Integer> winners, List<Integer> participants,
                          Map<Integer, Integer> payouts, List<Integer> reveal, Integer redoSeat, int nextDealer, int carry) {
    }

    private final String mode;
    private final String playMode;
    private final boolean redo;
    private final int unit;
    private final int cap;
    private final int dealer;
    private final int[] deck;
    private final List<Player> players = new ArrayList<>();
    private final List<LogEntry> log = new ArrayList<>();
    private int dp;
    private int level;
    private int pot;
    private int turn = -1;
    private String phase;
    private int round;
    private boolean roundBet;
    private Outcome outcome;

    /**
     * @param chips        자리별 보유 포인트
     * @param mode         "two" 또는 "three"
     * @param participants 재경기면 참가 자리, 아니면 null (모두 참가, 학교를 냄)
     * @param carry        재경기 이월 판돈
     */
    public SeotdaHand(List<Integer> chips, int dealer, int unit, String mode, List<Integer> participants, int carry, int[] deck) {
        int n = chips.size();
        List<Integer> parts = participants != null ? participants : java.util.stream.IntStream.range(0, n).boxed().toList();
        if (parts.size() < 2) throw new IllegalArgumentException("need_players");
        this.redo = participants != null;
        int ante = redo ? 0 : unit;
        this.mode = "three".equals(mode) ? "three" : "two";
        this.playMode = redo ? "two" : this.mode;
        this.unit = unit;
        this.deck = deck;
        for (int i = 0; i < n; i++) {
            boolean in = parts.contains(i);
            Player p = new Player(chips.get(i) - (in ? ante : 0), in);
            p.contrib = in ? ante : 0;
            players.add(p);
        }
        this.cap = parts.stream().mapToInt(chips::get).min().orElse(0);
        this.level = ante;
        this.pot = (redo ? carry : 0) + ante * parts.size();
        // 선이 재경기에 없으면 선 다음 참가자부터
        this.dealer = parts.contains(dealer) ? dealer : fromDealer(dealer, parts).get(0);
        if ("three".equals(playMode)) {
            dealRound(2);
            phase = "open";
        } else {
            dealRound(1);
            beginBetting(1);
        }
    }

    private static int ceil10(double v) {
        return (int) Math.ceil(v / 10) * 10;
    }

    private List<Integer> fromDealer(int d, List<Integer> seats) {
        int size = players.size();
        List<Integer> sorted = new ArrayList<>(seats);
        sorted.sort(Comparator.comparingInt(a -> Math.floorMod(a - d, size)));
        return sorted;
    }

    public List<Integer> liveSeats() {
        List<Integer> a = new ArrayList<>();
        for (int i = 0; i < players.size(); i++) if (players.get(i).isLive()) a.add(i);
        return a;
    }

    private void dealRound(int count) {
        List<Integer> order = fromDealer(dealer, liveSeats());
        for (int k = 0; k < count; k++) for (int i : order) players.get(i).cards.add(deck[dp++]);
    }

    private void beginBetting(int r) {
        for (Player p : players) {
            if (p.isLive()) {
                p.acted = false;
                p.canRaise = true;
            }
        }
        phase = "bet";
        round = r;
        roundBet = false;
        turn = fromDealer(dealer, liveSeats()).get(0);
    }

    public boolean isDone() {
        return "done".equals(phase);
    }

    public List<Integer> pendingSeats() {
        List<Integer> out = new ArrayList<>();
        for (int i : liveSeats()) {
            Player p = players.get(i);
            if ("open".equals(phase) && p.open == null) out.add(i);
            if ("select".equals(phase) && p.pick == null) out.add(i);
        }
        return out;
    }

    public List<Act> legalActions(int seat) {
        if (!"bet".equals(phase) || seat != turn) return List.of();
        Player p = players.get(seat);
        int toCall = level - p.contrib;
        List<Act> acts = new ArrayList<>();
        acts.add(new Act("die", 0));
        acts.add(toCall == 0 ? new Act("check", 0) : new Act("call", toCall));
        if (p.canRaise && level < cap) {
            if (!roundBet) addRaise(acts, p, "bbing", level + unit);
            if (roundBet && toCall > 0) addRaise(acts, p, "ddadang", level + toCall);
            addRaise(acts, p, "quarter", level + ceil10((pot + toCall) / 4.0));
            addRaise(acts, p, "half", level + ceil10((pot + toCall) / 2.0));
        }
        return acts;
    }

    private void addRaise(List<Act> acts, Player p, String type, int target) {
        int lv = Math.min(cap, target);
        if (lv > level) acts.add(new Act(type, lv - p.contrib));
    }

    public void bet(int seat, String type) {
        Act act = legalActions(seat).stream().filter(a -> a.type().equals(type)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("illegal_action"));
        Player p = players.get(seat);
        p.chips -= act.pay();
        p.contrib += act.pay();
        pot += act.pay();
        p.acted = true;
        p.last = type;
        if ("die".equals(type)) p.folded = true;
        if ("check".equals(type) || "call".equals(type)) p.canRaise = false;
        if (RAISES.contains(type)) {
            level = p.contrib;
            roundBet = true;
            for (int i = 0; i < players.size(); i++) {
                if (i != seat && players.get(i).isLive()) players.get(i).acted = false;
            }
        }
        log.add(new LogEntry(seat, type, act.pay()));
        advance(seat);
    }

    private void advance(int from) {
        List<Integer> alive = liveSeats();
        if (alive.size() == 1) {
            finish();
            return;
        }
        int n = players.size();
        for (int k = 1; k <= n; k++) {
            int i = (from + k) % n;
            Player o = players.get(i);
            if (o.isLive() && (!o.acted || o.contrib < level)) {
                turn = i;
                return;
            }
        }
        endRound();
    }

    private void endRound() {
        if (round == 1) {
            dealRound(1);
            beginBetting(2);
        } else if ("three".equals(playMode)) {
            phase = "select";
            turn = -1;
        } else {
            finish();
        }
    }

    /** 3장 섯다: 공개할 패 (0 또는 1) */
    public void open(int seat, Integer card) {
        if (!"open".equals(phase) || !pendingSeats().contains(seat) || card == null || (card != 0 && card != 1)) {
            throw new IllegalArgumentException("illegal_action");
        }
        players.get(seat).open = card;
        log.add(new LogEntry(seat, "open", 0));
        if (pendingSeats().isEmpty()) beginBetting(1);
    }

    /** 3장 섯다: 승부에 쓸 2장의 위치 */
    public void select(int seat, List<Integer> pick) {
        boolean ok = pick != null && pick.size() == 2 && pick.stream().allMatch(x -> x != null && x >= 0 && x < 3)
                && !pick.get(0).equals(pick.get(1));
        if (!"select".equals(phase) || !pendingSeats().contains(seat) || !ok) throw new IllegalArgumentException("illegal_action");
        players.get(seat).pick = new int[]{Math.min(pick.get(0), pick.get(1)), Math.max(pick.get(0), pick.get(1))};
        log.add(new LogEntry(seat, "select", 0));
        if (pendingSeats().isEmpty()) finish();
    }

    /** 3장 중 기본 세기가 가장 높은 2장 (시간 초과 때 자동 선택) */
    public List<Integer> bestPickByBase(int seat) {
        List<Integer> c = players.get(seat).cards;
        int[] best = PAIRS_OF_THREE[0];
        int bestBase = -1;
        for (int[] pr : PAIRS_OF_THREE) {
            int b = SeotdaRules.classify(c.get(pr[0]), c.get(pr[1])).base();
            if (b > bestBase) {
                bestBase = b;
                best = pr;
            }
        }
        return List.of(best[0], best[1]);
    }

    /** 나간 사람 처리: 단계와 상관없이 다이 */
    public void forceFold(int seat) {
        if (isDone()) return;
        Player p = players.get(seat);
        if (!p.isLive()) return;
        p.folded = true;
        p.acted = true;
        p.last = "die";
        log.add(new LogEntry(seat, "die", 0));
        if (liveSeats().size() == 1) {
            finish();
            return;
        }
        switch (phase) {
            case "bet" -> advance(seat == turn ? seat : Math.floorMod(turn - 1, players.size()));
            case "open" -> {
                if (pendingSeats().isEmpty()) beginBetting(1);
            }
            case "select" -> {
                if (pendingSeats().isEmpty()) finish();
            }
            default -> {
            }
        }
    }

    /** 승부에 쓰는 2장 (아직 정해지지 않았으면 null) */
    public List<Integer> handCards(int seat) {
        Player p = players.get(seat);
        if ("three".equals(playMode)) return p.pick == null ? null : List.of(p.cards.get(p.pick[0]), p.cards.get(p.pick[1]));
        return p.cards.size() == 2 ? List.copyOf(p.cards) : null;
    }

    private void finish() {
        Map<Integer, Integer> payouts = new LinkedHashMap<>();
        List<Integer> alive = liveSeats();
        if (alive.size() == 1) {
            payouts.put(alive.get(0), pot);
            outcome = new Outcome("fold", "fold", List.of(alive.get(0)), List.of(), payouts, List.of(), null, alive.get(0), 0);
        } else {
            List<Integer> order = fromDealer(dealer, alive);
            List<int[]> cards = order.stream().map(i -> {
                List<Integer> c = handCards(i);
                return new int[]{c.get(0), c.get(1)};
            }).toList();
            SeotdaRules.Result r = SeotdaRules.resolve(order, cards);
            if (r.redo()) {
                int a = r.redoSeat();
                SeotdaRules.Hand h = SeotdaRules.classify(handCards(a).get(0), handCards(a).get(1));
                outcome = new Outcome("redo", h.special(), List.of(), order, payouts, order, a, dealer, pot);
            } else if (r.winners().size() > 1) {
                List<Integer> tied = fromDealer(dealer, r.winners());
                outcome = new Outcome("redo", "tie", List.of(), tied, payouts, order, null, dealer, pot);
            } else {
                int w = r.winners().get(0);
                payouts.put(w, pot);
                outcome = new Outcome("showdown", "showdown", List.of(w), List.of(), payouts, order, null, w, 0);
            }
        }
        payouts.forEach((seat, v) -> players.get(seat).chips += v);
        phase = "done";
        turn = -1;
    }
}
