package kr.pe.tn.domain.omok.engine;

import java.util.ArrayList;
import java.util.List;

/**
 * 오목 규칙 판정 (프론트 pages/play/omok/engine.js 와 같은 판정, 기준 문서는 그쪽 RULES.md)
 *
 * 판: 15x15, 칸 번호 idx = y * 15 + x. 돌: 0 빈칸, 1 흑, 2 백
 * 규칙
 *  - renju    : 흑만 3-3·4-4·장목 금수. 흑은 정확히 5목, 백은 5목 이상이면 승리
 *  - standard : 흑백 모두 3-3 금수. 4-4 허용. 장목은 둘 수 있지만 승리가 아님
 *  - free     : 금수 없음. 5목 이상이면 승리
 */
public final class OmokRules {

    public static final int SIZE = 15;
    public static final int CELLS = SIZE * SIZE;
    public static final int EMPTY = 0;
    public static final int BLACK = 1;
    public static final int WHITE = 2;

    public static final String RENJU = "renju";
    public static final String STANDARD = "standard";
    public static final String FREE = "free";

    private static final int[][] DIRS = {{1, 0}, {0, 1}, {1, 1}, {1, -1}};

    private OmokRules() {
    }

    public static boolean isRule(String rule) {
        return RENJU.equals(rule) || STANDARD.equals(rule) || FREE.equals(rule);
    }

    /** 정확히 5목이어야 이기는 쪽인가 (장목이 승리가 아닌 쪽) */
    public static boolean needsExactFive(String rule, int color) {
        return STANDARD.equals(rule) || (RENJU.equals(rule) && color == BLACK);
    }

    /** 금수가 적용되는 쪽인가 */
    public static boolean isRestricted(String rule, int color) {
        return STANDARD.equals(rule) || (RENJU.equals(rule) && color == BLACK);
    }

    private static int at(int[] board, int x, int y) {
        return x >= 0 && y >= 0 && x < SIZE && y < SIZE ? board[y * SIZE + x] : -1;
    }

    /** (x,y)를 지나는 d 방향 연속 줄: {뒤로 이어진 수, 앞으로 이어진 수} */
    private static int[] run(int[] board, int x, int y, int d, int color) {
        int dx = DIRS[d][0], dy = DIRS[d][1];
        int back = 0, fwd = 0;
        while (at(board, x - (back + 1) * dx, y - (back + 1) * dy) == color) back++;
        while (at(board, x + (fwd + 1) * dx, y + (fwd + 1) * dy) == color) fwd++;
        return new int[]{back, fwd};
    }

    private static int runLen(int[] board, int x, int y, int d, int color) {
        int[] r = run(board, x, y, d, color);
        return r[0] + r[1] + 1;
    }

    private static boolean winningLen(int len, boolean exact) {
        return exact ? len == 5 : len >= 5;
    }

    /** idx 에 놓인 color 돌로 승리가 되었으면 그 줄의 칸 목록, 아니면 null */
    public static List<Integer> winLine(int[] board, int idx, int color, String rule) {
        int x = idx % SIZE, y = idx / SIZE;
        boolean exact = needsExactFive(rule, color);
        for (int d = 0; d < 4; d++) {
            int[] r = run(board, x, y, d, color);
            if (winningLen(r[0] + r[1] + 1, exact)) {
                List<Integer> line = new ArrayList<>();
                for (int k = -r[0]; k <= r[1]; k++) line.add((y + k * DIRS[d][1]) * SIZE + x + k * DIRS[d][0]);
                return line;
            }
        }
        return null;
    }

    /**
     * (x,y)의 돌을 포함해 5목을 완성하는 빈칸의 거리 목록 (d 방향, 연속 줄 양옆의 첫 빈칸 둘 중에서).
     * 반환: {개수, 첫째 거리, 둘째 거리}
     */
    private static int[] fivePoints(int[] board, int x, int y, int d, int color, boolean exact) {
        int dx = DIRS[d][0], dy = DIRS[d][1];
        int[] r = run(board, x, y, d, color);
        int[] out = new int[3];
        for (int k : new int[]{-(r[0] + 1), r[1] + 1}) {
            int qx = x + k * dx, qy = y + k * dy;
            if (at(board, qx, qy) != EMPTY) continue;
            board[qy * SIZE + qx] = color;
            int len = runLen(board, qx, qy, d, color);
            board[qy * SIZE + qx] = EMPTY;
            if (winningLen(len, exact)) out[++out[0]] = k;
        }
        return out;
    }

    /** 완성점이 2개이고 그 사이가 연속 4개 → 열린 4 */
    private static boolean isStraight(int[] pts) {
        return pts[0] == 2 && pts[2] - pts[1] == 5;
    }

    /**
     * (x,y)의 돌이 d 방향으로 3(한 수 더 두어 열린 4를 만들 수 있는 줄)인가.
     * 열린 4를 만드는 자리가 그 자체로 금수이면 3으로 치지 않는다 (거짓 금수).
     */
    private static boolean isThree(int[] board, int x, int y, int d, int color, String rule) {
        int dx = DIRS[d][0], dy = DIRS[d][1];
        boolean exact = needsExactFive(rule, color);
        int[] r0 = run(board, x, y, d, color);
        for (int k : new int[]{-(r0[0] + 1), r0[1] + 1}) {
            int qx = x + k * dx, qy = y + k * dy;
            if (at(board, qx, qy) != EMPTY) continue;
            int qi = qy * SIZE + qx;
            board[qi] = color;
            boolean straight = runLen(board, qx, qy, d, color) == 4
                    && isStraight(fivePoints(board, qx, qy, d, color, exact));
            board[qi] = EMPTY;
            if (straight && forbiddenReason(board, qi, color, rule) == null) return true;
        }
        return false;
    }

    /**
     * 빈칸 idx 에 color 가 두는 것이 금수인지. 금수면 "three3" | "four4" | "overline", 아니면 null.
     * 5목(승리)이 되는 수는 금수 모양이 함께 생겨도 금수가 아니다.
     * board 는 계산 중 잠시 바뀌었다가 원래대로 돌아온다.
     */
    public static String forbiddenReason(int[] board, int idx, int color, String rule) {
        if (!isRestricted(rule, color) || board[idx] != EMPTY) return null;
        int x = idx % SIZE, y = idx / SIZE;
        boolean exact = needsExactFive(rule, color);
        board[idx] = color;
        try {
            int[] lens = new int[4];
            boolean over = false;
            for (int d = 0; d < 4; d++) lens[d] = runLen(board, x, y, d, color);
            for (int d = 0; d < 4; d++) {
                if (winningLen(lens[d], exact)) return null;
                if (lens[d] >= 6) over = true;
            }
            boolean renju = RENJU.equals(rule);
            if (renju && over) return "overline";
            int fours = 0, threes = 0;
            for (int d = 0; d < 4; d++) {
                if (lens[d] >= 5) continue; // 일반룰의 장목 줄
                int[] pts = fivePoints(board, x, y, d, color, exact);
                int f = isStraight(pts) ? 1 : pts[0];
                if (f > 0) fours += f;
                else if (isThree(board, x, y, d, color, rule)) threes++;
            }
            if (renju && fours >= 2) return "four4";
            if (threes >= 2) return "three3";
            return null;
        } finally {
            board[idx] = EMPTY;
        }
    }

    /** color 가 둘 수 있는 빈칸이 하나라도 있는가 */
    public static boolean hasLegalMove(int[] board, int color, String rule) {
        for (int idx = 0; idx < CELLS; idx++) {
            if (board[idx] == EMPTY && forbiddenReason(board, idx, color, rule) == null) return true;
        }
        return false;
    }
}
