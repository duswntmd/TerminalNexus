package kr.pe.tn.domain.janggi.engine;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 장기 규칙 엔진 (프론트엔드 janggi/engine.js 와 동일한 규칙)
 *
 * 판 표현: int[90], idx = y * 9 + x (x: 0~8, y: 0~9)
 * - 위쪽(y 0~3)이 한, 아래쪽(y 6~9)이 초
 * - 칸 값: 0 = 빈칸, 기물 = 종류(1~7) | 진영(초 0, 한 8)
 */
public final class JanggiEngine {

    public static final int CHO = 0;
    public static final int HAN = 8;

    public static final int KING = 1;
    public static final int GUARD = 2;
    public static final int ROOK = 3;
    public static final int CANNON = 4;
    public static final int KNIGHT = 5;
    public static final int ELEPHANT = 6;
    public static final int PAWN = 7;

    public static final int PASS = -1;
    public static final int MAX_PLIES = 200;
    public static final double HAN_BONUS = 1.5;

    private static final int[][] ORTH = {{0, 1}, {0, -1}, {1, 0}, {-1, 0}};
    private static final int[][] DIAG_LINES = {
            {idx(3, 0), idx(4, 1), idx(5, 2)}, {idx(5, 0), idx(4, 1), idx(3, 2)},
            {idx(3, 7), idx(4, 8), idx(5, 9)}, {idx(5, 7), idx(4, 8), idx(3, 9)},
    };
    private static final Map<Integer, List<Integer>> DIAG = new HashMap<>();

    static {
        for (int[] line : DIAG_LINES) {
            DIAG.computeIfAbsent(line[0], k -> new ArrayList<>()).add(line[1]);
            DIAG.computeIfAbsent(line[2], k -> new ArrayList<>()).add(line[1]);
            DIAG.computeIfAbsent(line[1], k -> new ArrayList<>()).addAll(List.of(line[0], line[2]));
        }
    }

    /** 상차림: 왼쪽 차 옆부터 [b1, b2, b3, b4] (각 진영 자신의 시점 기준) */
    private static final Map<String, int[]> FORMATIONS = Map.of(
            "N_E_N_E", new int[]{KNIGHT, ELEPHANT, KNIGHT, ELEPHANT},
            "E_N_E_N", new int[]{ELEPHANT, KNIGHT, ELEPHANT, KNIGHT},
            "N_E_E_N", new int[]{KNIGHT, ELEPHANT, ELEPHANT, KNIGHT},
            "E_N_N_E", new int[]{ELEPHANT, KNIGHT, KNIGHT, ELEPHANT}
    );

    private JanggiEngine() {
    }

    public static boolean isValidFormation(String formation) {
        return formation != null && FORMATIONS.containsKey(formation);
    }

    public static int idx(int x, int y) {
        return y * 9 + x;
    }

    public static int typeOf(int p) {
        return p & 7;
    }

    public static int teamOf(int p) {
        return p & 8;
    }

    public static int enemyOf(int team) {
        return team == CHO ? HAN : CHO;
    }

    public static String teamName(int team) {
        return team == CHO ? "CHO" : "HAN";
    }

    private static boolean onBoard(int x, int y) {
        return x >= 0 && x <= 8 && y >= 0 && y <= 9;
    }

    private static boolean inPalace(int x, int y) {
        return x >= 3 && x <= 5 && ((y >= 0 && y <= 2) || (y >= 7 && y <= 9));
    }

    public static int[] createBoard(String choFormation, String hanFormation) {
        int[] b = new int[90];
        place(b, HAN, 0, 1, 2, 3, hanFormation);
        place(b, CHO, 9, 8, 7, 6, choFormation);
        return b;
    }

    private static void place(int[] b, int team, int backY, int kingY, int cannonY, int pawnY, String formation) {
        int[] f = FORMATIONS.getOrDefault(formation, FORMATIONS.get("N_E_N_E"));
        // 한은 위쪽에서 아래를 보므로 자기 기준 왼쪽 = x 8
        int[] col = new int[9];
        for (int x = 0; x < 9; x++) col[x] = team == CHO ? x : 8 - x;
        b[idx(col[0], backY)] = ROOK | team;
        b[idx(col[1], backY)] = f[0] | team;
        b[idx(col[2], backY)] = f[1] | team;
        b[idx(3, backY)] = GUARD | team;
        b[idx(5, backY)] = GUARD | team;
        b[idx(col[6], backY)] = f[2] | team;
        b[idx(col[7], backY)] = f[3] | team;
        b[idx(col[8], backY)] = ROOK | team;
        b[idx(4, kingY)] = KING | team;
        b[idx(1, cannonY)] = CANNON | team;
        b[idx(7, cannonY)] = CANNON | team;
        for (int x = 0; x <= 8; x += 2) b[idx(x, pawnY)] = PAWN | team;
    }

    /** 의사 합법수 (자기 궁이 잡히는지는 검사하지 않음) */
    public static List<Integer> pseudoMoves(int[] b, int from) {
        List<Integer> out = new ArrayList<>();
        int p = b[from];
        if (p == 0) return out;
        int team = teamOf(p);
        int x = from % 9;
        int y = from / 9;

        switch (typeOf(p)) {
            case KING, GUARD -> {
                for (int[] d : ORTH) {
                    int nx = x + d[0], ny = y + d[1];
                    if (inPalace(nx, ny) && (y <= 2) == (ny <= 2) && canLand(b, idx(nx, ny), team)) out.add(idx(nx, ny));
                }
                for (int t : DIAG.getOrDefault(from, List.of())) if (canLand(b, t, team)) out.add(t);
            }
            case ROOK -> {
                for (int[] d : ORTH) {
                    for (int nx = x + d[0], ny = y + d[1]; onBoard(nx, ny); nx += d[0], ny += d[1]) {
                        int t = idx(nx, ny);
                        if (b[t] == 0) {
                            out.add(t);
                            continue;
                        }
                        if (teamOf(b[t]) != team) out.add(t);
                        break;
                    }
                }
                for (int[] line : DIAG_LINES) {
                    int pos = indexOf(line, from);
                    if (pos < 0) continue;
                    for (int step : new int[]{-1, 1}) {
                        for (int i = pos + step; i >= 0 && i < 3; i += step) {
                            int t = line[i];
                            if (b[t] == 0) {
                                out.add(t);
                                continue;
                            }
                            if (teamOf(b[t]) != team) out.add(t);
                            break;
                        }
                    }
                }
            }
            case CANNON -> {
                for (int[] d : ORTH) {
                    boolean screen = false;
                    for (int nx = x + d[0], ny = y + d[1]; onBoard(nx, ny); nx += d[0], ny += d[1]) {
                        int t = idx(nx, ny);
                        int q = b[t];
                        if (!screen) {
                            if (q != 0) {
                                if (typeOf(q) == CANNON) break;
                                screen = true;
                            }
                            continue;
                        }
                        if (q == 0) {
                            out.add(t);
                            continue;
                        }
                        if (teamOf(q) != team && typeOf(q) != CANNON) out.add(t);
                        break;
                    }
                }
                for (int[] line : DIAG_LINES) {
                    int pos = indexOf(line, from);
                    if (pos != 0 && pos != 2) continue;
                    int mid = b[line[1]];
                    int t = line[2 - pos];
                    if (mid != 0 && typeOf(mid) != CANNON
                            && (b[t] == 0 || (teamOf(b[t]) != team && typeOf(b[t]) != CANNON))) out.add(t);
                }
            }
            case KNIGHT -> {
                for (int[] d : ORTH) {
                    int lx = x + d[0], ly = y + d[1];
                    if (!onBoard(lx, ly) || b[idx(lx, ly)] != 0) continue;
                    for (int s : new int[]{-1, 1}) {
                        int nx = lx + d[0] + (d[0] == 0 ? s : 0);
                        int ny = ly + d[1] + (d[1] == 0 ? s : 0);
                        if (onBoard(nx, ny) && canLand(b, idx(nx, ny), team)) out.add(idx(nx, ny));
                    }
                }
            }
            case ELEPHANT -> {
                for (int[] d : ORTH) {
                    int ax = x + d[0], ay = y + d[1];
                    if (!onBoard(ax, ay) || b[idx(ax, ay)] != 0) continue;
                    for (int s : new int[]{-1, 1}) {
                        int ddx = d[0] == 0 ? s : d[0];
                        int ddy = d[1] == 0 ? s : d[1];
                        int bx = ax + ddx, by = ay + ddy;
                        if (!onBoard(bx, by) || b[idx(bx, by)] != 0) continue;
                        int nx = bx + ddx, ny = by + ddy;
                        if (onBoard(nx, ny) && canLand(b, idx(nx, ny), team)) out.add(idx(nx, ny));
                    }
                }
            }
            case PAWN -> {
                int f = team == CHO ? -1 : 1;
                int[][] dirs = {{0, f}, {-1, 0}, {1, 0}};
                for (int[] d : dirs) {
                    int nx = x + d[0], ny = y + d[1];
                    if (onBoard(nx, ny) && canLand(b, idx(nx, ny), team)) out.add(idx(nx, ny));
                }
                for (int t : DIAG.getOrDefault(from, List.of())) {
                    if (t / 9 == y + f && canLand(b, t, team)) out.add(t);
                }
            }
            default -> {
            }
        }
        return out;
    }

    private static boolean canLand(int[] b, int t, int team) {
        return b[t] == 0 || teamOf(b[t]) != team;
    }

    private static int indexOf(int[] arr, int v) {
        for (int i = 0; i < arr.length; i++) if (arr[i] == v) return i;
        return -1;
    }

    public static int findKing(int[] b, int team) {
        for (int i = 0; i < 90; i++) if (b[i] == (KING | team)) return i;
        return -1;
    }

    public static boolean isAttacked(int[] b, int sq, int byTeam) {
        for (int i = 0; i < 90; i++) {
            int p = b[i];
            if (p != 0 && teamOf(p) == byTeam && pseudoMoves(b, i).contains(sq)) return true;
        }
        return false;
    }

    public static boolean inCheck(int[] b, int team) {
        int k = findKing(b, team);
        return k >= 0 && isAttacked(b, k, enemyOf(team));
    }

    public static int[] applyToBoard(int[] b, int from, int to) {
        if (from == PASS) return b;
        int[] nb = Arrays.copyOf(b, 90);
        nb[to] = nb[from];
        nb[from] = 0;
        return nb;
    }

    public static boolean isLegal(int[] b, int team, int from, int to) {
        if (from < 0 || from >= 90 || to < 0 || to >= 90) return false;
        int p = b[from];
        if (p == 0 || teamOf(p) != team) return false;
        if (!pseudoMoves(b, from).contains(to)) return false;
        return !inCheck(applyToBoard(b, from, to), team);
    }

    public static boolean hasAnyLegalMove(int[] b, int team) {
        for (int i = 0; i < 90; i++) {
            int p = b[i];
            if (p == 0 || teamOf(p) != team) continue;
            for (int to : pseudoMoves(b, i)) {
                if (!inCheck(applyToBoard(b, i, to), team)) return true;
            }
        }
        return false;
    }

    public static boolean kingsFacing(int[] b) {
        int c = findKing(b, CHO);
        int h = findKing(b, HAN);
        if (c < 0 || h < 0 || c % 9 != h % 9) return false;
        for (int i = Math.min(c, h) + 9; i < Math.max(c, h); i += 9) if (b[i] != 0) return false;
        return true;
    }

    private static int score(int type) {
        return switch (type) {
            case ROOK -> 13;
            case CANNON -> 7;
            case KNIGHT -> 5;
            case ELEPHANT, GUARD -> 3;
            case PAWN -> 2;
            default -> 0;
        };
    }

    /** [초 점수, 한 점수(덤 포함)] */
    public static double[] scores(int[] b) {
        double cho = 0, han = HAN_BONUS;
        for (int p : b) {
            if (p == 0) continue;
            if (teamOf(p) == CHO) cho += score(typeOf(p));
            else han += score(typeOf(p));
        }
        return new double[]{cho, han};
    }

    public static String scoreWinner(int[] b) {
        double[] s = scores(b);
        return s[0] > s[1] ? "CHO" : "HAN";
    }
}
