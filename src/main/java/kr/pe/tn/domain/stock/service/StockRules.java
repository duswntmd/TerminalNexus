package kr.pe.tn.domain.stock.service;

/**
 * 한국 거래소(KRX) 방식 매매 규칙
 * - 호가 단위, 가격제한폭(±30%), 수수료·거래세
 */
public final class StockRules {

    public static final double FEE_RATE = 0.00015; // 매수·매도 수수료 0.015%
    public static final double TAX_RATE = 0.0018;  // 매도 거래세 0.18%
    public static final double LIMIT_RATE = 0.30;  // 상·하한가 ±30%

    private StockRules() {
    }

    /** 가격대별 호가 단위 */
    public static long tickSize(long price) {
        if (price < 2_000) return 1;
        if (price < 5_000) return 5;
        if (price < 20_000) return 10;
        if (price < 50_000) return 50;
        if (price < 200_000) return 100;
        if (price < 500_000) return 500;
        return 1_000;
    }

    /** 호가 단위로 내림 */
    public static long floorToTick(long price) {
        long t = tickSize(price);
        return Math.max(1, (price / t) * t);
    }

    /** 호가 단위로 올림 */
    public static long ceilToTick(long price) {
        long t = tickSize(price);
        long floored = (price / t) * t;
        return floored == price ? price : floored + t;
    }

    public static long roundToTick(long price) {
        long lo = floorToTick(price);
        long hi = ceilToTick(price);
        return (price - lo) <= (hi - price) ? lo : hi;
    }

    public static boolean isOnTick(long price) {
        return price > 0 && price % tickSize(price) == 0;
    }

    /** 상한가: 기준가 +30% 를 호가 단위로 내림 */
    public static long upperLimit(long basePrice) {
        return floorToTick((long) Math.floor(basePrice * (1 + LIMIT_RATE)));
    }

    /** 하한가: 기준가 -30% 를 호가 단위로 올림 */
    public static long lowerLimit(long basePrice) {
        return Math.max(1, ceilToTick((long) Math.ceil(basePrice * (1 - LIMIT_RATE))));
    }

    /** 다음 호가 (위) */
    public static long tickUp(long price) {
        return price + tickSize(price);
    }

    /** 다음 호가 (아래) */
    public static long tickDown(long price) {
        long down = price - tickSize(price - 1);
        return Math.max(1, down);
    }

    public static long fee(long amount) {
        return (long) Math.floor(amount * FEE_RATE);
    }

    public static long tax(long amount) {
        return (long) Math.floor(amount * TAX_RATE);
    }
}
