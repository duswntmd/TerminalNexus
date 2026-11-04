package kr.pe.tn.domain.seotda.engine;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 섯다 족보 판정 (프론트 frontend/src/pages/play/seotda/engine.js 의 classify·resolve 와 같은 규칙)
 * 카드: 0~19. 월 = id/2 + 1, 짝수 id 가 그 달의 특별한 패(1·3·8월 광, 나머지 열끗)
 * 규칙을 바꾸면 두 곳을 함께 고치고 node scripts/seotda-test.mjs --fixture 로 기준 파일을 다시 만든다.
 */
public final class SeotdaRules {

    public static final int CARD_COUNT = 20;

    private static final int AMHAENG_ON = 950;   // 13·18광땡을 잡음 (38광땡 아래)
    private static final int TTAENGJABI_ON = 795; // 1~9땡을 잡음 (장땡 아래)
    private static final int GUSA_LIMIT = 600;    // 구사: 남은 상대 최고 패가 알리 이하면 재경기
    private static final int MGUSA_LIMIT = 790;   // 멍텅구리구사: 9땡 이하면 재경기

    private SeotdaRules() {
    }

    /** 2장 패. special: amhaeng, ttaengjabi, gusa, mgusa 또는 null */
    public record Hand(String code, int month, int kkut, String special, int base) {
    }

    /** 승부 결과. strength: 자리 번호 → 특수패를 반영한 세기 */
    public record Result(boolean redo, Integer redoSeat, List<Integer> winners, Map<Integer, Integer> strength) {
    }

    public static int monthOf(int id) {
        return id / 2 + 1;
    }

    private static int first(int month) {
        return (month - 1) * 2;
    }

    public static Hand classify(int a, int b) {
        int x = Math.min(a, b);
        int y = Math.max(a, b);
        int m1 = monthOf(x);
        int m2 = monthOf(y);
        if (x == first(3) && y == first(8)) return new Hand("gwang38", 0, 0, null, 1000);
        if (x == first(1) && y == first(3)) return new Hand("gwang13", 0, 0, null, 900);
        if (x == first(1) && y == first(8)) return new Hand("gwang18", 0, 0, null, 900);
        if (m1 == m2) return new Hand("ttaeng", m1, 0, null, 700 + m1 * 10);
        String named = switch (m1 + "-" + m2) {
            case "1-2" -> "ali:600";
            case "1-4" -> "doksa:590";
            case "1-9" -> "gubbing:580";
            case "1-10" -> "jangbbing:570";
            case "4-10" -> "jangsa:560";
            case "4-6" -> "seryuk:550";
            default -> null;
        };
        if (named != null) {
            String[] p = named.split(":");
            return new Hand(p[0], 0, 0, null, Integer.parseInt(p[1]));
        }
        int kkut = (m1 + m2) % 10;
        String special = null;
        if (x == first(4) && y == first(7)) special = "amhaeng";
        else if (x == first(3) && y == first(7)) special = "ttaengjabi";
        else if (m1 == 4 && m2 == 9) special = (x == first(4) && y == first(9)) ? "mgusa" : "gusa";
        return new Hand("kkut", 0, kkut, special, 100 + kkut);
    }

    /** seats[i] 자리의 cards[i] 패들로 승부 (다이하지 않은 사람만 넘긴다) */
    public static Result resolve(List<Integer> seats, List<int[]> cards) {
        int n = seats.size();
        List<Hand> hands = new ArrayList<>();
        for (int[] c : cards) hands.add(classify(c[0], c[1]));

        for (int i = 0; i < n && n >= 2; i++) {
            Hand h = hands.get(i);
            Integer limit = "gusa".equals(h.special()) ? Integer.valueOf(GUSA_LIMIT)
                    : "mgusa".equals(h.special()) ? Integer.valueOf(MGUSA_LIMIT) : null;
            if (limit != null && othersMax(hands, i) <= limit) {
                Map<Integer, Integer> st = new HashMap<>();
                for (int j = 0; j < n; j++) st.put(seats.get(j), hands.get(j).base());
                return new Result(true, seats.get(i), List.of(), st);
            }
        }

        Map<Integer, Integer> strength = new HashMap<>();
        int best = Integer.MIN_VALUE;
        for (int i = 0; i < n; i++) {
            Hand h = hands.get(i);
            int s = h.base();
            if ("amhaeng".equals(h.special()) && anyOther(hands, i, o -> o.base() == 900)) s = AMHAENG_ON;
            if ("ttaengjabi".equals(h.special()) && anyOther(hands, i, o -> "ttaeng".equals(o.code()) && o.month() < 10)) s = TTAENGJABI_ON;
            strength.put(seats.get(i), s);
            best = Math.max(best, s);
        }
        List<Integer> winners = new ArrayList<>();
        for (int i = 0; i < n; i++) if (strength.get(seats.get(i)) == best) winners.add(seats.get(i));
        return new Result(false, null, winners, strength);
    }

    private static int othersMax(List<Hand> hands, int skip) {
        int max = Integer.MIN_VALUE;
        for (int j = 0; j < hands.size(); j++) if (j != skip) max = Math.max(max, hands.get(j).base());
        return max;
    }

    private static boolean anyOther(List<Hand> hands, int skip, java.util.function.Predicate<Hand> p) {
        for (int j = 0; j < hands.size(); j++) if (j != skip && p.test(hands.get(j))) return true;
        return false;
    }
}
