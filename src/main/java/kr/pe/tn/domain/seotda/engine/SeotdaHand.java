package kr.pe.tn.domain.seotda.engine;

import lombok.Getter;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 섯다 한 판 진행 (프론트 engine.js 의 newHand·legalActions·applyAction 과 같은 규칙)
 * - 모두 기본 판돈을 내고 2장씩 받은 뒤 선부터 한 바퀴 베팅
 * - 다이·체크·콜·삥(아무도 안 올렸을 때 기본 판돈만큼)·하프(콜 + (판돈+콜)/2, 10 단위 올림)
 * - 올리기는 한 판에 한 사람당 한 번, 한 사람 총액은 판 시작 때 가장 적게 가진 사람의 포인트까지
 * 금액은 서버가 계산하고 클라이언트는 행동 종류만 보낸다. 할 수 없는 행동은 IllegalArgumentException("illegal_action")
 */
@Getter
public class SeotdaHand {

    public static final List<String> ACTIONS = List.of("die", "check", "call", "bbing", "half");

    @Getter
    public static class Player {
        private int chips;
        private int contrib;
        private final int[] cards;
        private boolean folded;
        private boolean acted;
        private boolean raised;
        private String last;

        Player(int chips, int[] cards) {
            this.chips = chips;
            this.cards = cards;
        }
    }

    public record Act(String type, int pay) {
    }

    public record LogEntry(int seat, String type, int pay) {
    }

    /** type: fold, showdown, redo */
    public record Outcome(String type, List<Integer> winners, Map<Integer, Integer> payouts, List<Integer> reveal,
                          Integer redoSeat, int nextDealer, int carry) {
    }

    private final int ante;
    private final int cap;
    private final int dealer;
    private final int carry;
    private final List<Player> players = new ArrayList<>();
    private final List<LogEntry> log = new ArrayList<>();
    private int level;
    private int pot;
    private int turn;
    private boolean done;
    private Outcome outcome;

    /**
     * @param chips 자리별 보유 포인트 (모두 ante 이상)
     * @param deck  섞인 카드 20장
     */
    public SeotdaHand(List<Integer> chips, int dealer, int ante, int carry, int[] deck) {
        int n = chips.size();
        if (n < 2) throw new IllegalArgumentException("need_players");
        this.ante = ante;
        this.dealer = dealer;
        this.carry = carry;
        this.cap = chips.stream().mapToInt(Integer::intValue).min().orElse(ante);
        for (int i = 0; i < n; i++) {
            int order = (i - dealer + n) % n; // 선부터 한 장씩 돌림
            Player p = new Player(chips.get(i) - ante, new int[]{deck[order], deck[order + n]});
            p.contrib = ante;
            players.add(p);
        }
        this.level = ante;
        this.pot = carry + ante * n;
        this.turn = dealer;
    }

    private static int ceil10(int v) {
        return (v + 9) / 10 * 10;
    }

    public List<Act> legalActions(int seat) {
        if (done || seat != turn) return List.of();
        Player p = players.get(seat);
        int toCall = level - p.contrib;
        List<Act> acts = new ArrayList<>();
        acts.add(new Act("die", 0));
        acts.add(toCall == 0 ? new Act("check", 0) : new Act("call", toCall));
        if (!p.raised && level < cap) {
            if (level == ante) acts.add(new Act("bbing", Math.min(cap, level + ante) - p.contrib));
            int half = Math.min(cap, level + ceil10((pot + toCall) / 2));
            if (half > level) acts.add(new Act("half", half - p.contrib));
        }
        return acts;
    }

    public void apply(int seat, String type) {
        Act act = legalActions(seat).stream().filter(a -> a.type().equals(type)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("illegal_action"));
        Player p = players.get(seat);
        p.chips -= act.pay();
        p.contrib += act.pay();
        pot += act.pay();
        p.acted = true;
        p.last = type;
        if ("die".equals(type)) p.folded = true;
        if ("bbing".equals(type) || "half".equals(type)) {
            p.raised = true;
            level = p.contrib;
            for (int i = 0; i < players.size(); i++) {
                if (i != seat && !players.get(i).folded) players.get(i).acted = false;
            }
        }
        log.add(new LogEntry(seat, type, act.pay()));
        advance(seat);
    }

    /** 나간 사람 처리: 차례와 상관없이 다이 */
    public void forceFold(int seat) {
        if (done) return;
        Player p = players.get(seat);
        if (p.folded) return;
        p.folded = true;
        p.acted = true;
        p.last = "die";
        log.add(new LogEntry(seat, "die", 0));
        int n = players.size();
        advance(seat == turn ? seat : (turn - 1 + n) % n);
    }

    private List<Integer> alive() {
        List<Integer> a = new ArrayList<>();
        for (int i = 0; i < players.size(); i++) if (!players.get(i).folded) a.add(i);
        return a;
    }

    private void advance(int from) {
        List<Integer> alive = alive();
        if (alive.size() == 1) {
            finish(alive);
            return;
        }
        int n = players.size();
        for (int k = 1; k <= n; k++) {
            int i = (from + k) % n;
            Player o = players.get(i);
            if (!o.folded && (!o.acted || o.contrib < level)) {
                turn = i;
                return;
            }
        }
        finish(alive);
    }

    private int orderFromDealer(int seat) {
        return (seat - dealer + players.size()) % players.size();
    }

    private void finish(List<Integer> alive) {
        Map<Integer, Integer> payouts = new LinkedHashMap<>();
        if (alive.size() == 1) {
            payouts.put(alive.get(0), pot);
            outcome = new Outcome("fold", List.copyOf(alive), payouts, List.of(), null, alive.get(0), 0);
        } else {
            List<int[]> cards = alive.stream().map(i -> players.get(i).cards).toList();
            SeotdaRules.Result r = SeotdaRules.resolve(alive, cards);
            if (r.redo()) {
                outcome = new Outcome("redo", List.of(), payouts, List.copyOf(alive), r.redoSeat(), dealer, pot);
            } else {
                List<Integer> winners = new ArrayList<>(r.winners());
                winners.sort((a, b) -> orderFromDealer(a) - orderFromDealer(b));
                int share = pot / winners.size();
                for (int k = 0; k < winners.size(); k++) {
                    payouts.put(winners.get(k), share + (k == 0 ? pot - share * winners.size() : 0));
                }
                outcome = new Outcome("showdown", winners, payouts, List.copyOf(alive), null, winners.get(0), 0);
            }
        }
        payouts.forEach((seat, v) -> players.get(seat).chips += v);
        done = true;
        turn = -1;
    }
}
