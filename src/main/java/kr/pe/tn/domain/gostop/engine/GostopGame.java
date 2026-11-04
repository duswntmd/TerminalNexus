package kr.pe.tn.domain.gostop.engine;

import java.security.SecureRandom;
import java.util.*;

/**
 * 고스톱 맞고(2인) 규칙 엔진 — 프론트 frontend/src/pages/play/gostop/engine.js 와 같은 규칙.
 * 패는 서버만 알고, 화면에는 viewFor(seat)로 상대 손패와 덱 순서를 가린 상태만 보낸다.
 * 카드 번호 0~47, 월 = id / 4 + 1 (frontend/src/components/hwatu/cards.js 와 같은 순서)
 * 이 객체는 스레드 안전하지 않다. 방(GostopRoom)이 synchronized로 감싼다.
 */
public class GostopGame {

    public static final int WIN_SCORE = 7;
    public static final int CHONGTONG_SCORE = 10;
    public static final int PPEOK3_SCORE = 7;
    public static final int PIBAK_MAX = 7;
    public static final int GUKJIN_ID = 32;

    static final int GWANG = 0, YEOL = 1, TTI = 2, PI = 3;
    static final int[] KIND = new int[48];
    static final String[] RIBBON = new String[48]; // hong, cheong, cho, plain
    static final int[] PI_VAL = new int[48];
    static final boolean[] BIRD = new boolean[48];
    static final boolean[] BI = new boolean[48];

    static {
        // G 광, Gb 비광, Y 열끗, Yb 고도리 새, Yk 국진, T? 띠(h 홍단 c 청단 o 초단 p 비띠), P 피, P2 쌍피
        String[][] spec = {
                {"G", "Th", "P", "P"}, {"Yb", "Th", "P", "P"}, {"G", "Th", "P", "P"}, {"Yb", "To", "P", "P"},
                {"Y", "To", "P", "P"}, {"Y", "Tc", "P", "P"}, {"Y", "To", "P", "P"}, {"G", "Yb", "P", "P"},
                {"Yk", "Tc", "P", "P"}, {"Y", "Tc", "P", "P"}, {"G", "P2", "P", "P"}, {"Gb", "Y", "Tp", "P2"},
        };
        for (int m = 0; m < 12; m++) {
            for (int i = 0; i < 4; i++) {
                int id = m * 4 + i;
                String s = spec[m][i];
                switch (s.charAt(0)) {
                    case 'G' -> { KIND[id] = GWANG; BI[id] = s.equals("Gb"); }
                    case 'Y' -> { KIND[id] = YEOL; BIRD[id] = s.equals("Yb"); }
                    case 'T' -> {
                        KIND[id] = TTI;
                        RIBBON[id] = switch (s.charAt(1)) {
                            case 'h' -> "hong";
                            case 'c' -> "cheong";
                            case 'o' -> "cho";
                            default -> "plain";
                        };
                    }
                    default -> { KIND[id] = PI; PI_VAL[id] = s.equals("P2") ? 2 : 1; }
                }
            }
        }
    }

    public static int monthOf(int id) {
        return id / 4 + 1;
    }

    /* ───────── 상태 ───────── */
    List<Integer> deck;              // 끝이 맨 위
    List<Integer> floor;
    final List<List<Integer>> hands = List.of(new ArrayList<>(), new ArrayList<>());
    final List<List<Integer>> captured = List.of(new ArrayList<>(), new ArrayList<>());
    final int[] dummy = new int[2];
    final int[] shakes = new int[2];
    final int[] ppeok = new int[2];
    final int[] goCount = new int[2];
    final int[] goScore = new int[2];
    final String[] gukjin = new String[2]; // null 자동, "yeol", "pi"
    final Map<Integer, Integer> ppeokOwner = new HashMap<>();
    int first;
    int turn;
    int turnNo;
    String phase = "play"; // play, choose, goStop, end
    Pending pending;
    int carry = 1;
    List<Map<String, Object>> events = new ArrayList<>();
    Map<String, Object> last;
    Integer resultWinner;
    String resultReason;
    Integer resultMonth;

    static class Pending {
        int player;
        String stage = "hand";
        Integer played;
        int month;
        int m;
        List<Integer> takes = new ArrayList<>();
        int steal;
        Integer placed;
        Integer handPair;
        Integer flipped;
        boolean bomb;
        Integer chooseCard;
        List<Integer> options;
    }

    /** 행동: type = play | bomb | flip | choose | go | stop | gukjin */
    public record Action(String type, Integer card, Boolean shake, Integer month, String value) {
        public static Action of(String type) {
            return new Action(type, null, null, null, null);
        }

        public static Action play(int card) {
            return new Action("play", card, false, null, null);
        }

        boolean isShake() {
            return Boolean.TRUE.equals(shake);
        }
    }

    private static final Random RNG = new SecureRandom();

    /** 새 판. 바닥에 같은 월 4장이면 다시 섞고, 손에 4장(총통)이면 바로 끝 */
    public static GostopGame newGame(int first, int carry) {
        List<Integer> d;
        for (;;) {
            d = new ArrayList<>();
            for (int i = 0; i < 48; i++) d.add(i);
            Collections.shuffle(d, RNG);
            List<Integer> fl = d.subList(20, 28);
            boolean four = false;
            for (int m = 1; m <= 12; m++) if (monthCount(fl, m) == 4) four = true;
            if (!four) break;
        }
        return fromDeck(d, first, carry);
    }

    /** 정해진 덱 순서로 시작 (시험용): 0~9 선 손패, 10~19 후 손패, 20~27 바닥, 나머지 덱 */
    public static GostopGame fromDeck(List<Integer> d, int first, int carry) {
        GostopGame g = new GostopGame();
        g.hands.get(first).addAll(d.subList(0, 10));
        g.hands.get(1 - first).addAll(d.subList(10, 20));
        g.floor = new ArrayList<>(d.subList(20, 28));
        g.deck = new ArrayList<>(d.subList(28, d.size()));
        g.first = first;
        g.turn = first;
        g.carry = carry;
        for (int p : new int[]{first, 1 - first}) {
            for (int m = 1; m <= 12; m++) {
                if (monthCount(g.hands.get(p), m) == 4) {
                    g.phase = "end";
                    g.resultWinner = p;
                    g.resultReason = "chongtong";
                    g.resultMonth = m;
                    g.event("chongtong", p, Map.of("month", m));
                    return g;
                }
            }
        }
        return g;
    }

    /** 시험용: 상태를 직접 지정 */
    public static GostopGame custom(List<Integer> hand0, List<Integer> hand1, List<Integer> floor, List<Integer> deck) {
        GostopGame g = new GostopGame();
        g.hands.get(0).addAll(hand0);
        g.hands.get(1).addAll(hand1);
        g.floor = new ArrayList<>(floor);
        g.deck = new ArrayList<>(deck);
        return g;
    }

    static int monthCount(Collection<Integer> cards, int month) {
        int n = 0;
        for (int c : cards) if (monthOf(c) == month) n++;
        return n;
    }

    private List<Integer> ofMonth(Collection<Integer> cards, int month) {
        List<Integer> r = new ArrayList<>();
        for (int c : cards) if (monthOf(c) == month) r.add(c);
        return r;
    }

    private void event(String type, Integer player, Map<String, Object> extra) {
        Map<String, Object> e = new LinkedHashMap<>();
        e.put("type", type);
        if (player != null) e.put("player", player);
        if (extra != null) e.putAll(extra);
        events.add(e);
    }

    /* ───────── 점수 ───────── */

    public record Score(int total, int gwang, int tti, int yeol, int pi,
                        int gwangCount, int yeolCount, int ttiCount, int piCount,
                        String gukjin, List<List<Object>> items) {
    }

    public static Score scoreOf(List<Integer> cap, String gukjin) {
        if (gukjin == null && cap.contains(GUKJIN_ID)) {
            Score a = scoreOf(cap, "yeol");
            Score b = scoreOf(cap, "pi");
            return b.total() > a.total() ? b : a;
        }
        boolean asPi = "pi".equals(gukjin);
        int gw = 0, yeol = 0, tti = 0, pi = 0, birds = 0;
        boolean hasBi = false;
        Map<String, Integer> ribbons = new HashMap<>();
        for (int id : cap) {
            switch (KIND[id]) {
                case GWANG -> { gw++; if (BI[id]) hasBi = true; }
                case YEOL -> {
                    if (asPi && id == GUKJIN_ID) pi += 2;
                    else { yeol++; if (BIRD[id]) birds++; }
                }
                case TTI -> { tti++; ribbons.merge(RIBBON[id], 1, Integer::sum); }
                default -> pi += PI_VAL[id];
            }
        }
        List<List<Object>> items = new ArrayList<>();
        int g = 0;
        if (gw == 5) { g = 15; items.add(List.of("ogwang", 15)); }
        else if (gw == 4) { g = 4; items.add(List.of("sagwang", 4)); }
        else if (gw == 3) { g = hasBi ? 2 : 3; items.add(List.of(hasBi ? "bisamgwang" : "samgwang", g)); }

        int t = 0;
        for (String r : new String[]{"hong", "cheong", "cho"}) {
            if (ribbons.getOrDefault(r, 0) == 3) { t += 3; items.add(List.of(r + "dan", 3)); }
        }
        if (tti >= 5) { t += tti - 4; items.add(List.of("tti", tti - 4)); }

        int y = 0;
        if (birds == 3) { y += 5; items.add(List.of("godori", 5)); }
        if (yeol >= 5) { y += yeol - 4; items.add(List.of("yeol", yeol - 4)); }

        int p = pi >= 10 ? pi - 9 : 0;
        if (p > 0) items.add(List.of("pi", p));

        String gk = cap.contains(GUKJIN_ID) ? (asPi ? "pi" : "yeol") : null;
        return new Score(g + t + y + p, g, t, y, p, gw, yeol, tti, pi, gk, items);
    }

    public Score playerScore(int p) {
        return scoreOf(captured.get(p), gukjin[p]);
    }

    /* ───────── 행동 ───────── */

    private static boolean sameKind(int a, int b) {
        return KIND[a] == KIND[b] && PI_VAL[a] == PI_VAL[b] && Objects.equals(RIBBON[a], RIBBON[b])
                && BIRD[a] == BIRD[b] && a != GUKJIN_ID && b != GUKJIN_ID;
    }

    public List<Action> legalActions() {
        List<Action> acts = new ArrayList<>();
        if (phase.equals("end")) return acts;
        if (phase.equals("goStop")) return List.of(Action.of("go"), Action.of("stop"));
        if (phase.equals("choose")) {
            for (int c : pending.options) acts.add(new Action("choose", c, null, null, null));
            return acts;
        }
        List<Integer> hand = hands.get(turn);
        Set<Integer> bombed = new HashSet<>();
        for (int card : hand) {
            int m = monthOf(card);
            int inHand = monthCount(hand, m);
            int onFloor = monthCount(floor, m);
            acts.add(Action.play(card));
            if (inHand == 3 && onFloor == 0) acts.add(new Action("play", card, true, null, null));
            if (inHand == 3 && onFloor == 1 && bombed.add(m)) acts.add(new Action("bomb", null, null, m, null));
        }
        if (dummy[turn] > 0 && !deck.isEmpty()) acts.add(Action.of("flip"));
        return acts;
    }

    public boolean isEnded() {
        return phase.equals("end");
    }

    public int getTurn() {
        return turn;
    }

    private static IllegalArgumentException illegal() {
        return new IllegalArgumentException("illegal_action");
    }

    /** 국진 설정은 차례와 상관없이 바꿀 수 있다 */
    public void setGukjin(int player, String value) {
        if (value != null && !value.equals("yeol") && !value.equals("pi")) throw illegal();
        gukjin[player] = value;
    }

    /** 현재 차례 사람의 행동 적용. 잘못된 행동이면 예외 */
    public void apply(Action a) {
        if (a == null || a.type() == null) throw illegal();
        if (isEnded()) throw new IllegalStateException("not_playing");
        events = new ArrayList<>();
        int p = turn;

        if (phase.equals("goStop")) {
            if (a.type().equals("go")) {
                goCount[p]++;
                goScore[p] = playerScore(p).total();
                event("go", p, Map.of("count", goCount[p]));
                passTurn();
                return;
            }
            if (a.type().equals("stop")) {
                event("stop", p, null);
                finish(p, "stop");
                return;
            }
            throw illegal();
        }

        if (phase.equals("choose")) {
            if (!a.type().equals("choose") || a.card() == null || !pending.options.contains(a.card())) throw illegal();
            Pending pd = pending;
            pd.takes.add(pd.chooseCard);
            pd.takes.add(a.card());
            if (pd.stage.equals("hand")) pd.handPair = a.card();
            pd.options = null;
            phase = "play";
            if (pd.stage.equals("hand")) flipStep(pd);
            else endTurn(pd);
            return;
        }

        List<Integer> hand = hands.get(p);
        Pending pd = new Pending();
        pd.player = p;

        switch (a.type()) {
            case "flip" -> {
                if (dummy[p] <= 0 || deck.isEmpty()) throw illegal();
                dummy[p]--;
                flipStep(pd);
            }
            case "bomb" -> {
                if (a.month() == null) throw illegal();
                List<Integer> mine = ofMonth(hand, a.month());
                List<Integer> fm = ofMonth(floor, a.month());
                if (mine.size() != 3 || fm.size() != 1) throw illegal();
                hand.removeAll(mine);
                pd.month = a.month();
                pd.bomb = true;
                pd.played = mine.get(0);
                pd.m = 3;
                pd.takes.addAll(mine);
                pd.takes.add(fm.get(0));
                pd.steal++;
                shakes[p]++;
                dummy[p] += 2;
                event("bomb", p, Map.of("month", a.month(), "cards", mine));
                flipStep(pd);
            }
            case "play" -> {
                if (a.card() == null || !hand.contains(a.card())) throw illegal();
                int card = a.card();
                int month = monthOf(card);
                List<Integer> matches = ofMonth(floor, month);
                if (a.isShake()) {
                    if (monthCount(hand, month) != 3 || !matches.isEmpty()) throw illegal();
                    shakes[p]++;
                    event("shake", p, Map.of("month", month, "cards", ofMonth(hand, month)));
                }
                hand.remove(Integer.valueOf(card));
                pd.played = card;
                pd.month = month;
                pd.m = matches.size();
                event("play", p, Map.of("card", card));
                if (matches.isEmpty()) {
                    floor.add(card);
                    pd.placed = card;
                } else if (matches.size() == 1) {
                    pd.takes.add(card);
                    pd.takes.add(matches.get(0));
                    pd.handPair = matches.get(0);
                } else if (matches.size() == 2) {
                    if (sameKind(matches.get(0), matches.get(1))) {
                        pd.takes.add(card);
                        pd.takes.add(matches.get(0));
                        pd.handPair = matches.get(0);
                    } else {
                        pd.chooseCard = card;
                        pd.options = matches;
                        pending = pd;
                        phase = "choose";
                        return;
                    }
                } else {
                    pd.takes.add(card);
                    pd.takes.addAll(matches);
                    takeStack(pd, month);
                }
                flipStep(pd);
            }
            default -> throw illegal();
        }
    }

    private void takeStack(Pending pd, int month) {
        Integer owner = ppeokOwner.remove(month);
        if (owner == null) return;
        boolean self = owner == pd.player;
        pd.steal += self ? 2 : 1;
        event(self ? "jappeok" : "eatppeok", pd.player, Map.of("month", month));
    }

    private void flipStep(Pending pd) {
        pd.stage = "flip";
        pending = null;
        if (deck.isEmpty()) {
            endTurn(pd);
            return;
        }
        int f = deck.remove(deck.size() - 1);
        int fm = monthOf(f);
        pd.flipped = f;
        event("flip", pd.player, Map.of("card", f));

        if (pd.played != null && !pd.bomb && fm == pd.month) {
            if (pd.m == 0) {
                pd.takes.add(pd.placed);
                pd.takes.add(f);
                pd.steal++;
                event("jjok", pd.player, null);
            } else if (pd.m == 1) {
                pd.takes.remove(pd.played);
                pd.takes.remove(pd.handPair);
                floor.add(pd.played);
                floor.add(f);
                ppeokOwner.put(pd.month, pd.player);
                ppeok[pd.player]++;
                event("ppeok", pd.player, Map.of("month", pd.month, "count", ppeok[pd.player]));
            } else if (pd.m == 2) {
                for (int c : ofMonth(floor, pd.month)) if (!pd.takes.contains(c)) pd.takes.add(c);
                pd.takes.add(f);
                pd.steal++;
                event("ttadak", pd.player, null);
            }
            endTurn(pd);
            return;
        }

        List<Integer> matches = new ArrayList<>();
        for (int c : ofMonth(floor, fm)) if (!pd.takes.contains(c)) matches.add(c);
        if (matches.isEmpty()) {
            floor.add(f);
        } else if (matches.size() == 1) {
            pd.takes.add(f);
            pd.takes.add(matches.get(0));
        } else if (matches.size() == 2) {
            if (sameKind(matches.get(0), matches.get(1))) {
                pd.takes.add(f);
                pd.takes.add(matches.get(0));
            } else {
                pd.chooseCard = f;
                pd.options = matches;
                pending = pd;
                phase = "choose";
                return;
            }
        } else {
            pd.takes.add(f);
            pd.takes.addAll(matches);
            takeStack(pd, fm);
        }
        endTurn(pd);
    }

    private void steal(int p, int n) {
        List<Integer> cap = captured.get(1 - p);
        int got = 0;
        for (int i = 0; i < n; i++) {
            Integer pick = null;
            for (int id : cap) if (KIND[id] == PI && PI_VAL[id] == 1) { pick = id; break; }
            if (pick == null) for (int id : cap) if (KIND[id] == PI && PI_VAL[id] == 2) { pick = id; break; }
            if (pick == null && "pi".equals(gukjin[1 - p]) && cap.contains(GUKJIN_ID)) pick = GUKJIN_ID;
            if (pick == null) break;
            cap.remove(pick);
            captured.get(p).add(pick);
            got++;
        }
        if (got > 0) event("steal", p, Map.of("count", got));
    }

    private void endTurn(Pending pd) {
        int p = pd.player;
        pending = null;
        phase = "play";
        List<Integer> takes = new ArrayList<>(new LinkedHashSet<>(pd.takes));
        floor.removeAll(takes);
        captured.get(p).addAll(takes);
        if (!takes.isEmpty() && floor.isEmpty() && !deck.isEmpty()) {
            pd.steal++;
            event("sweep", p, null);
        }
        if (pd.steal > 0) steal(p, pd.steal);
        Map<String, Object> l = new HashMap<>();
        l.put("player", p);
        l.put("played", pd.played);
        l.put("flipped", pd.flipped);
        l.put("took", takes);
        last = l;
        turnNo++;

        if (ppeok[p] >= 3) {
            finish(p, "ppeok3");
            return;
        }
        int sc = playerScore(p).total();
        boolean ready = goCount[p] == 0 ? sc >= WIN_SCORE : sc > goScore[p];
        if (ready) {
            if (hands.get(p).size() + dummy[p] == 0 || deck.isEmpty()) {
                finish(p, "stop");
                return;
            }
            phase = "goStop";
            event("canGo", p, Map.of("score", sc));
            return;
        }
        passTurn();
    }

    private boolean canMove(int q) {
        return !hands.get(q).isEmpty() || (dummy[q] > 0 && !deck.isEmpty());
    }

    private void passTurn() {
        int next = 1 - turn;
        if (!canMove(next) && !canMove(turn)) {
            finish(null, "nagari");
            return;
        }
        turn = canMove(next) ? next : turn;
        phase = "play";
    }

    private void finish(Integer winner, String reason) {
        phase = "end";
        pending = null;
        resultWinner = winner;
        resultReason = reason;
        if (reason.equals("nagari")) event("nagari", null, null);
    }

    /** 대국 중 나간 사람은 패배 (점수 없음) */
    public void forfeit(int leaver) {
        if (isEnded()) return;
        events = new ArrayList<>();
        finish(1 - leaver, "leave");
    }

    /* ───────── 정산 ───────── */

    /** 판 결과. 화면 settle()과 같은 모양의 Map (winner, reason, base, score, goCount, multipliers, final, nextCarry) */
    public Map<String, Object> settle() {
        if (!isEnded()) return null;
        Map<String, Object> r = new LinkedHashMap<>();
        List<List<Object>> muls = new ArrayList<>();
        if (carry > 1) muls.add(List.of("carry", carry));
        r.put("winner", resultWinner);
        r.put("reason", resultReason);
        r.put("multipliers", muls);
        r.put("goCount", 0);
        r.put("score", null);
        r.put("nextCarry", 1);
        switch (resultReason) {
            case "nagari" -> {
                r.put("base", 0);
                r.put("final", 0);
                r.put("nextCarry", carry * 2);
                return r;
            }
            case "leave" -> {
                muls.clear();
                r.put("base", 0);
                r.put("final", 0);
                return r;
            }
            case "chongtong", "ppeok3" -> {
                int base = resultReason.equals("chongtong") ? CHONGTONG_SCORE : PPEOK3_SCORE;
                r.put("base", base);
                r.put("final", base * carry);
                return r;
            }
            default -> { }
        }
        int w = resultWinner;
        int l = 1 - w;
        Score ws = playerScore(w);
        int go = goCount[w];
        int base = ws.total() + go;
        if (go >= 3) muls.add(List.of("go", 1 << (go - 2)));
        if (shakes[w] > 0) muls.add(List.of("shake", 1 << shakes[w]));
        List<List<Object>> baks = baks(ws, l, gukjin[l] == null ? "yeol" : gukjin[l]);
        if (gukjin[l] == null && captured.get(l).contains(GUKJIN_ID)) {
            List<List<Object>> alt = baks(ws, l, "pi");
            if (alt.size() < baks.size()) baks = alt;
        }
        muls.addAll(baks);
        if (goCount[l] > 0) muls.add(List.of("gobak", 2));
        int fin = base;
        for (List<Object> m : muls) fin *= (Integer) m.get(1);
        r.put("base", base);
        r.put("score", Map.of("items", ws.items(), "total", ws.total()));
        r.put("goCount", go);
        r.put("final", fin);
        return r;
    }

    private List<List<Object>> baks(Score ws, int l, String g) {
        Score ls = scoreOf(captured.get(l), g);
        List<List<Object>> list = new ArrayList<>();
        if (ws.pi() > 0 && ls.piCount() <= PIBAK_MAX) list.add(List.of("pibak", 2));
        if (ws.gwang() > 0 && ls.gwangCount() == 0) list.add(List.of("gwangbak", 2));
        if (ws.yeol() > 0 && ls.yeolCount() == 0) list.add(List.of("meongbak", 2));
        return list;
    }

    public Integer getResultWinner() {
        return resultWinner;
    }

    public int getFirst() {
        return first;
    }

    public int getCarry() {
        return carry;
    }

    /* ───────── 보기 제한 ───────── */

    private static List<Integer> hidden(int n) {
        return new ArrayList<>(Collections.nCopies(n, -1));
    }

    /** seat 시점 상태 (seat가 -1이면 두 손패 모두 가림). 화면 engine.js 상태와 같은 이름 */
    public Map<String, Object> viewFor(int seat) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("deck", hidden(deck.size()));
        v.put("floor", new ArrayList<>(floor));
        v.put("hands", List.of(
                seat == 0 ? new ArrayList<>(hands.get(0)) : hidden(hands.get(0).size()),
                seat == 1 ? new ArrayList<>(hands.get(1)) : hidden(hands.get(1).size())));
        v.put("captured", List.of(new ArrayList<>(captured.get(0)), new ArrayList<>(captured.get(1))));
        v.put("dummy", dummy.clone());
        v.put("shakes", shakes.clone());
        v.put("ppeok", ppeok.clone());
        v.put("goCount", goCount.clone());
        v.put("goScore", goScore.clone());
        v.put("gukjin", Arrays.asList(gukjin.clone()));
        v.put("ppeokOwner", new HashMap<>(ppeokOwner));
        v.put("first", first);
        v.put("turn", turn);
        v.put("turnNo", turnNo);
        v.put("phase", phase);
        if (pending != null) {
            Map<String, Object> pd = new LinkedHashMap<>();
            pd.put("player", pending.player);
            pd.put("stage", pending.stage);
            pd.put("chooseCard", pending.chooseCard);
            pd.put("options", new ArrayList<>(pending.options));
            pd.put("takes", new ArrayList<>(pending.takes));
            v.put("pending", pd);
        } else {
            v.put("pending", null);
        }
        v.put("carry", carry);
        v.put("events", new ArrayList<>(events));
        v.put("last", last);
        if (isEnded()) {
            Map<String, Object> res = new HashMap<>();
            res.put("winner", resultWinner);
            res.put("reason", resultReason);
            res.put("month", resultMonth);
            v.put("result", res);
        } else {
            v.put("result", null);
        }
        return v;
    }

    /** 카드 48장이 그대로인지 (시험용) */
    public List<Integer> allCards() {
        List<Integer> all = new ArrayList<>(deck);
        all.addAll(floor);
        hands.forEach(all::addAll);
        captured.forEach(all::addAll);
        if (pending != null) {
            Set<Integer> limbo = new LinkedHashSet<>();
            if (pending.chooseCard != null) limbo.add(pending.chooseCard);
            limbo.addAll(pending.takes);
            for (int c : limbo) if (!floor.contains(c)) all.add(c);
        }
        return all;
    }

    public List<Integer> hand(int p) {
        return Collections.unmodifiableList(hands.get(p));
    }

    public List<Integer> capturedOf(int p) {
        return Collections.unmodifiableList(captured.get(p));
    }

    public String getPhase() {
        return phase;
    }

    public List<Map<String, Object>> getEvents() {
        return events;
    }
}
