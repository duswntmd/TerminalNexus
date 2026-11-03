package kr.pe.tn.domain.chess.engine;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 체스 국면과 규칙 (프론트 pages/play/chess/engine.js 와 같은 규칙)
 *
 * 판: 길이 64, 0 = a8 … 63 = h1
 * 기물: 종류(1~6) | 색(WHITE 8, BLACK 16), 빈 칸 0
 * 수: from | to<<6 | promo<<12 | flag<<15
 */
public class ChessPosition {

    public static final int WHITE = 8;
    public static final int BLACK = 16;
    public static final int PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
    public static final int FLAG_DOUBLE = 1, FLAG_EP = 2, FLAG_CASTLE = 3;

    public static final String START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    private static final String FILES = "abcdefgh";
    private static final String LETTERS = " pnbrqk";

    private static final int[][] RAYS = new int[64 * 8][];
    private static final int[][] KNIGHT_T = new int[64][];
    private static final int[][] KING_T = new int[64][];
    private static final int[] CASTLE_MASK = new int[64];

    static {
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}, {-1, -1}, {-1, 1}, {1, -1}, {1, 1}};
        int[][] jumps = {{-2, -1}, {-2, 1}, {-1, -2}, {-1, 2}, {1, -2}, {1, 2}, {2, -1}, {2, 1}};
        for (int sq = 0; sq < 64; sq++) {
            int r = sq >> 3, c = sq & 7;
            for (int d = 0; d < 8; d++) {
                List<Integer> ray = new ArrayList<>();
                for (int rr = r + dirs[d][0], cc = c + dirs[d][1]; inside(rr, cc); rr += dirs[d][0], cc += dirs[d][1]) {
                    ray.add(rr * 8 + cc);
                }
                RAYS[sq * 8 + d] = ray.stream().mapToInt(Integer::intValue).toArray();
            }
            KNIGHT_T[sq] = targets(r, c, jumps);
            KING_T[sq] = targets(r, c, dirs);
            CASTLE_MASK[sq] = 15;
        }
        CASTLE_MASK[56] = 15 & ~2;
        CASTLE_MASK[63] = 15 & ~1;
        CASTLE_MASK[60] = 15 & ~3;
        CASTLE_MASK[0] = 15 & ~8;
        CASTLE_MASK[7] = 15 & ~4;
        CASTLE_MASK[4] = 15 & ~12;
    }

    private static boolean inside(int r, int c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    private static int[] targets(int r, int c, int[][] offsets) {
        List<Integer> res = new ArrayList<>();
        for (int[] o : offsets) if (inside(r + o[0], c + o[1])) res.add((r + o[0]) * 8 + c + o[1]);
        return res.stream().mapToInt(Integer::intValue).toArray();
    }

    public static int encode(int from, int to, int promo, int flag) {
        return from | (to << 6) | (promo << 12) | (flag << 15);
    }

    public static int from(int m) { return m & 63; }
    public static int to(int m) { return (m >> 6) & 63; }
    public static int promo(int m) { return (m >> 12) & 7; }
    public static int flag(int m) { return (m >> 15) & 3; }

    public static String sqName(int sq) {
        return "" + FILES.charAt(sq & 7) + (8 - (sq >> 3));
    }

    public static String toUci(int m) {
        return sqName(from(m)) + sqName(to(m)) + (promo(m) != 0 ? String.valueOf(LETTERS.charAt(promo(m))) : "");
    }

    private final int[] board = new int[64];
    private int turn = WHITE;
    private int castling;
    private int ep = -1;
    private int halfmove;
    private int fullmove = 1;
    private final int[] kings = {-1, -1};
    private final List<int[]> undo = new ArrayList<>();

    public static ChessPosition fromFen(String fen) {
        ChessPosition pos = new ChessPosition();
        String[] f = fen.trim().split("\\s+");
        String[] rows = f[0].split("/");
        if (rows.length != 8) throw new IllegalArgumentException("잘못된 FEN");
        for (int r = 0; r < 8; r++) {
            int c = 0;
            for (char ch : rows[r].toCharArray()) {
                if (ch >= '1' && ch <= '8') c += ch - '0';
                else {
                    int t = LETTERS.indexOf(Character.toLowerCase(ch));
                    if (t <= 0 || c > 7) throw new IllegalArgumentException("잘못된 FEN");
                    int p = t | (Character.isUpperCase(ch) ? WHITE : BLACK);
                    pos.board[r * 8 + c] = p;
                    if (t == KING) pos.kings[(p & 24) >> 4] = r * 8 + c;
                    c++;
                }
            }
            if (c != 8) throw new IllegalArgumentException("잘못된 FEN");
        }
        if (pos.kings[0] < 0 || pos.kings[1] < 0) throw new IllegalArgumentException("킹이 없는 FEN");
        pos.turn = f.length > 1 && f[1].equals("b") ? BLACK : WHITE;
        if (f.length > 2) {
            for (char ch : f[2].toCharArray()) {
                pos.castling |= switch (ch) { case 'K' -> 1; case 'Q' -> 2; case 'k' -> 4; case 'q' -> 8; default -> 0; };
            }
        }
        pos.ep = f.length > 3 && !f[3].equals("-") ? (8 - (f[3].charAt(1) - '0')) * 8 + FILES.indexOf(f[3].charAt(0)) : -1;
        pos.halfmove = f.length > 4 ? Integer.parseInt(f[4]) : 0;
        pos.fullmove = f.length > 5 ? Integer.parseInt(f[5]) : 1;
        return pos;
    }

    public int getTurn() { return turn; }
    public int getHalfmove() { return halfmove; }

    public boolean isAttacked(int sq, int by) {
        int r = sq >> 3, c = sq & 7;
        if (by == WHITE) {
            if (r < 7 && ((c < 7 && board[sq + 9] == (PAWN | WHITE)) || (c > 0 && board[sq + 7] == (PAWN | WHITE)))) return true;
        } else if (r > 0 && ((c > 0 && board[sq - 9] == (PAWN | BLACK)) || (c < 7 && board[sq - 7] == (PAWN | BLACK)))) {
            return true;
        }
        for (int t : KNIGHT_T[sq]) if (board[t] == (KNIGHT | by)) return true;
        for (int t : KING_T[sq]) if (board[t] == (KING | by)) return true;
        for (int d = 0; d < 8; d++) {
            int slider = d < 4 ? (ROOK | by) : (BISHOP | by);
            for (int t : RAYS[sq * 8 + d]) {
                int p = board[t];
                if (p != 0) {
                    if (p == slider || p == (QUEEN | by)) return true;
                    break;
                }
            }
        }
        return false;
    }

    public boolean inCheck() {
        return isAttacked(kings[turn >> 4], turn ^ 24);
    }

    /** 의사 합법수 */
    public List<Integer> generate() {
        List<Integer> out = new ArrayList<>();
        int us = turn, them = turn ^ 24;
        int[] promos = {QUEEN, ROOK, BISHOP, KNIGHT};
        for (int sq = 0; sq < 64; sq++) {
            int p = board[sq];
            if (p == 0 || (p & 24) != us) continue;
            int t = p & 7;
            if (t == PAWN) {
                int dir = us == WHITE ? -8 : 8;
                int one = sq + dir;
                boolean lastRow = (one >> 3) == 0 || (one >> 3) == 7;
                int c = sq & 7;
                if (board[one] == 0) {
                    if (lastRow) for (int pr : promos) out.add(encode(sq, one, pr, 0));
                    else {
                        out.add(encode(sq, one, 0, 0));
                        int startRow = us == WHITE ? 6 : 1;
                        if ((sq >> 3) == startRow && board[one + dir] == 0) out.add(encode(sq, one + dir, 0, FLAG_DOUBLE));
                    }
                }
                for (int k = 0; k < 2; k++) {
                    if (k == 0 ? c == 0 : c == 7) continue;
                    int to = one + (k == 0 ? -1 : 1);
                    int tp = board[to];
                    if (tp != 0 && (tp & 24) == them) {
                        if (lastRow) for (int pr : promos) out.add(encode(sq, to, pr, 0));
                        else out.add(encode(sq, to, 0, 0));
                    } else if (to == ep) {
                        out.add(encode(sq, to, 0, FLAG_EP));
                    }
                }
            } else if (t == KNIGHT || t == KING) {
                for (int to : t == KNIGHT ? KNIGHT_T[sq] : KING_T[sq]) {
                    int tp = board[to];
                    if (tp == 0 || (tp & 24) == them) out.add(encode(sq, to, 0, 0));
                }
            } else {
                int d0 = t == BISHOP ? 4 : 0;
                int d1 = t == ROOK ? 4 : 8;
                for (int d = d0; d < d1; d++) {
                    for (int to : RAYS[sq * 8 + d]) {
                        int tp = board[to];
                        if (tp == 0) out.add(encode(sq, to, 0, 0));
                        else {
                            if ((tp & 24) == them) out.add(encode(sq, to, 0, 0));
                            break;
                        }
                    }
                }
            }
        }
        // 캐슬링: 사이 칸이 비고, 킹이 지나는 칸(출발 칸 포함)이 공격받지 않아야 함
        if (castling != 0) {
            int base = us == WHITE ? 56 : 0;
            int kSide = us == WHITE ? 1 : 4;
            int qSide = us == WHITE ? 2 : 8;
            int e = base + 4;
            if (board[e] == (KING | us) && !isAttacked(e, them)) {
                if ((castling & kSide) != 0 && board[base + 5] == 0 && board[base + 6] == 0 && board[base + 7] == (ROOK | us)
                        && !isAttacked(base + 5, them) && !isAttacked(base + 6, them)) {
                    out.add(encode(e, base + 6, 0, FLAG_CASTLE));
                }
                if ((castling & qSide) != 0 && board[base + 3] == 0 && board[base + 2] == 0 && board[base + 1] == 0
                        && board[base] == (ROOK | us) && !isAttacked(base + 3, them) && !isAttacked(base + 2, them)) {
                    out.add(encode(e, base + 2, 0, FLAG_CASTLE));
                }
            }
        }
        return out;
    }

    public void make(int m) {
        int from = from(m), to = to(m), promo = promo(m), flag = flag(m);
        int piece = board[from];
        int us = turn;
        int capSq = flag == FLAG_EP ? (us == WHITE ? to + 8 : to - 8) : to;
        int captured = board[capSq];
        undo.add(new int[]{m, captured, castling, ep, halfmove});
        board[capSq] = 0;
        board[from] = 0;
        board[to] = promo != 0 ? (promo | us) : piece;
        if (flag == FLAG_CASTLE) {
            int rf = to > from ? from + 3 : from - 4;
            int rt = to > from ? from + 1 : from - 1;
            board[rt] = board[rf];
            board[rf] = 0;
        }
        if ((piece & 7) == KING) kings[us >> 4] = to;
        castling &= CASTLE_MASK[from] & CASTLE_MASK[to];
        ep = flag == FLAG_DOUBLE ? (from + to) >> 1 : -1;
        halfmove = (piece & 7) == PAWN || captured != 0 ? 0 : halfmove + 1;
        if (us == BLACK) fullmove++;
        turn = us ^ 24;
    }

    public void unmake() {
        int[] u = undo.remove(undo.size() - 1);
        int m = u[0], captured = u[1];
        castling = u[2];
        ep = u[3];
        halfmove = u[4];
        int from = from(m), to = to(m), flag = flag(m);
        int us = turn ^ 24;
        turn = us;
        if (us == BLACK) fullmove--;
        int piece = promo(m) != 0 ? (PAWN | us) : board[to];
        board[from] = piece;
        board[to] = 0;
        if (flag == FLAG_EP) board[us == WHITE ? to + 8 : to - 8] = captured;
        else board[to] = captured;
        if (flag == FLAG_CASTLE) {
            int rf = to > from ? from + 3 : from - 4;
            int rt = to > from ? from + 1 : from - 1;
            board[rf] = board[rt];
            board[rt] = 0;
        }
        if ((piece & 7) == KING) kings[us >> 4] = from;
    }

    private boolean leftKingSafe() {
        int mover = turn ^ 24;
        return !isAttacked(kings[mover >> 4], turn);
    }

    public List<Integer> legalMoves() {
        List<Integer> res = new ArrayList<>();
        for (int m : generate()) {
            make(m);
            if (leftKingSafe()) res.add(m);
            unmake();
        }
        return res;
    }

    /** uci 문자열에 해당하는 합법수, 없으면 null */
    public Integer findLegal(String uci) {
        if (uci == null) return null;
        for (int m : legalMoves()) if (toUci(m).equals(uci)) return m;
        return null;
    }

    public long perft(int depth) {
        if (depth == 0) return 1;
        long n = 0;
        for (int m : generate()) {
            make(m);
            if (leftKingSafe()) n += depth == 1 ? 1 : perft(depth - 1);
            unmake();
        }
        return n;
    }

    /** 기물 부족 무승부: 킹끼리, 킹+경기물 하나, 같은 색 칸 비숍만 */
    public boolean insufficientMaterial() {
        int minors = 0, knights = 0;
        Set<Integer> bishopColors = new HashSet<>();
        for (int sq = 0; sq < 64; sq++) {
            int t = board[sq] & 7;
            if (t == PAWN || t == ROOK || t == QUEEN) return false;
            if (t == KNIGHT) { minors++; knights++; }
            if (t == BISHOP) { minors++; bishopColors.add(((sq >> 3) + (sq & 7)) & 1); }
        }
        if (minors <= 1) return true;
        return knights == 0 && bishopColors.size() == 1;
    }

    private String placement() {
        StringBuilder s = new StringBuilder();
        for (int r = 0; r < 8; r++) {
            int empty = 0;
            for (int c = 0; c < 8; c++) {
                int p = board[r * 8 + c];
                if (p == 0) { empty++; continue; }
                if (empty > 0) { s.append(empty); empty = 0; }
                char ch = LETTERS.charAt(p & 7);
                s.append((p & 24) == WHITE ? Character.toUpperCase(ch) : ch);
            }
            if (empty > 0) s.append(empty);
            if (r < 7) s.append('/');
        }
        return s.toString();
    }

    private String castlingText() {
        String s = ((castling & 1) != 0 ? "K" : "") + ((castling & 2) != 0 ? "Q" : "")
                + ((castling & 4) != 0 ? "k" : "") + ((castling & 8) != 0 ? "q" : "");
        return s.isEmpty() ? "-" : s;
    }

    public String toFen() {
        return placement() + " " + (turn == WHITE ? "w" : "b") + " " + castlingText() + " "
                + (ep >= 0 ? sqName(ep) : "-") + " " + halfmove + " " + fullmove;
    }

    /** 3회 동일 국면 판정용 키 (실제로 가능한 앙파상만 포함) */
    public String repetitionKey() {
        boolean epLive = ep >= 0 && legalMoves().stream().anyMatch(m -> flag(m) == FLAG_EP);
        return placement() + " " + (turn == WHITE ? "w" : "b") + " " + castlingText() + " " + (epLive ? sqName(ep) : "-");
    }
}
