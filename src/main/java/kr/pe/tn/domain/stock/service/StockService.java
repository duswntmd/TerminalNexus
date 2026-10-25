package kr.pe.tn.domain.stock.service;

import kr.pe.tn.domain.stock.dto.StockDTO;
import kr.pe.tn.domain.stock.entity.*;
import kr.pe.tn.domain.stock.repository.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import static kr.pe.tn.domain.stock.entity.StockOrderEntity.OrderStatus.PENDING;
import static kr.pe.tn.domain.stock.entity.StockTradeEntity.TradeType.BUY;
import static kr.pe.tn.domain.stock.entity.StockTradeEntity.TradeType.SELL;

/**
 * 모의 주식 거래소
 *
 * - 3초마다 시세 틱: 추세 + 적정가 회귀 + 무작위 변동, 호가 단위·상하한가(기준가 ±30%) 적용
 * - 1시간 = 1거래일: 매 정시 장 마감 → 종가가 다음 기준가, 일봉 저장
 * - 시장가 매수 = 매도1호가, 시장가 매도 = 매수1호가 / 지정가는 가격이 닿으면 지정가로 체결
 * - 수수료 0.015%, 매도 시 거래세 0.18%
 * - 잔고 변경은 지갑 쓰기 잠금 아래에서만 → 주문과 자동 체결이 동시에 와도 금액이 꼬이지 않음
 */
@Service
@RequiredArgsConstructor
public class StockService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(StockService.class);

    public static final long INITIAL_CASH = 1_000_000L;
    private static final long TICK_MS = 3_000L;
    private static final long SESSION_MS = 3_600_000L;               // 1거래일 = 1시간
    private static final double TICKS_PER_SESSION = SESSION_MS / (double) TICK_MS;
    private static final double BASE_SESSION_VOL = 0.03;              // 기준 변동성: 거래일당 3%
    private static final double TURNOVER_PER_SESSION = 0.004;         // 거래일당 회전율 0.4%
    private static final int RECENT_TICKS = 40;

    private final StockRepository stockRepository;
    private final StockWalletRepository walletRepository;
    private final StockHoldingRepository holdingRepository;
    private final StockTradeRepository tradeRepository;
    private final StockOrderRepository orderRepository;
    private final StockCandleRepository candleRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private final Random random = new Random();

    /** 주문 처리용 최신 시세 (틱마다 갱신) */
    private final Map<String, Quote> quotes = new ConcurrentHashMap<>();
    private final Map<String, Trend> trends = new ConcurrentHashMap<>();
    private final Map<String, CandleBuilder> minuteCandles = new ConcurrentHashMap<>();
    private final Map<String, Deque<StockDTO.TickResponse>> recentTicks = new ConcurrentHashMap<>();
    private final Map<String, Long> userVolume = new ConcurrentHashMap<>(); // 사용자 체결량 (다음 틱 거래량에 합산)
    private final List<StockDTO.StockNewsResponse> recentNews = Collections.synchronizedList(new ArrayList<>());
    private volatile long sessionIndex = System.currentTimeMillis() / SESSION_MS;
    private volatile List<StockDTO.LeaderboardResponse> leaderboardCache = List.of();
    private volatile long leaderboardAt = 0L;

    /** 시세 스냅샷 */
    private record Quote(long price, long previousClose, long tickVolume) {
        long upper() {
            return StockRules.upperLimit(previousClose);
        }

        long lower() {
            return StockRules.lowerLimit(previousClose);
        }

        /** 매도1호가 (상한가면 매도 잔량 없음) */
        long bestAsk() {
            return price >= upper() ? Long.MAX_VALUE : StockRules.tickUp(price);
        }

        /** 매수1호가 (하한가면 매수 잔량 없음) */
        long bestBid() {
            return price <= lower() ? 0 : price;
        }
    }

    private static class Trend {
        double drift;
        int remaining;
    }

    private static class CandleBuilder {
        final long start;
        long open, high, low, close, volume;

        CandleBuilder(long start, long price) {
            this.start = start;
            open = high = low = close = price;
        }

        void add(long price, long vol) {
            high = Math.max(high, price);
            low = Math.min(low, price);
            close = price;
            volume += vol;
        }
    }

    /* ─────────────────────────── 초기화 ─────────────────────────── */

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initStocks() {
        if (stockRepository.count() == 0) {
            stockRepository.saveAll(List.of(
                    StockEntity.create("NEXUS", "TerminalNexus Corp", 50_000, 0.015, 1_500_000_000_000L, 18.5, 2.1, "AI플랫폼 / 터미널", "개발자 및 파워유저를 위한 차세대 통합 터미널 플랫폼 기업."),
                    StockEntity.create("HACK", "HackerMode Inc", 12_000, 0.035, 360_000_000_000L, 42.0, 5.4, "사이버보안", "지능형 침투 탐지 솔루션 및 사이버 보안 전문 기업."),
                    StockEntity.create("FORGE", "ForgeStone Ltd", 85_000, 0.008, 3_200_000_000_000L, 12.2, 1.4, "게임", "확률형 롤플레잉 게임 엔진 및 아이템 강화 시스템 개발사."),
                    StockEntity.create("LOTTO", "LuckyDraw Co", 3_000, 0.060, 90_000_000_000L, 88.0, 9.2, "엔터 / 추첨", "확률 알고리즘 기반 추첨 서비스를 운영하는 고변동성 엔터 기업."),
                    StockEntity.create("CHAT", "TalkBridge Corp", 28_000, 0.020, 840_000_000_000L, 24.1, 3.0, "메신저", "실시간 메시징 프로토콜 및 대규모 채팅 서버 인프라 기업."),
                    StockEntity.create("FRUIT", "FruitAI Systems", 120_000, 0.010, 4_800_000_000_000L, 15.8, 2.8, "AI / 비전", "딥러닝 기반 농산물 품질 자동 감정 AI 기업."),
                    StockEntity.create("TYPE", "TypeSpeed Inc", 7_500, 0.040, 225_000_000_000L, 31.5, 4.1, "e스포츠", "온라인 타자 배틀 리그 플랫폼 운영사."),
                    StockEntity.create("GHOST", "GhostNet Corp", 45_000, 0.025, 1_350_000_000_000L, 21.0, 2.5, "네트워크 / 보안", "익명 네트워크 터널링 및 암호화 통신 솔루션 개발사.")
            ));
            log.info("가상 주식 8개 종목 초기 등록 완료");
        }

        boolean upgraded = false;
        for (StockEntity s : stockRepository.findAll()) {
            upgraded |= s.ensureInitialized();
            quotes.put(s.getTicker(), new Quote(s.getCurrentPrice(), s.getPreviousClose(), avgTickVolume(s)));
            minuteCandles.put(s.getTicker(), new CandleBuilder(minuteStart(System.currentTimeMillis()), s.getCurrentPrice()));
            seedHistoryIfEmpty(s);
        }
        if (upgraded) migrateLegacyPositions();
    }

    /**
     * 개편 전 데이터 정리 (최초 1회)
     * - 공매도·레버리지 보유분은 현재가로 정산해 현금 반환
     * - 기존 미체결 주문은 모두 취소하고 묶인 금액 환불
     */
    private void migrateLegacyPositions() {
        int settled = 0, cancelled = 0;
        for (StockOrderEntity o : orderRepository.findByOrderStatus(PENDING)) {
            if (o.getTradeType() == BUY) {
                walletRepository.findByUserForUpdate(o.getUser()).ifPresent(w ->
                        w.deposit(o.getReservedCash() != null ? o.getReservedCash() : o.getTargetPrice() * o.getQuantity()));
            }
            o.cancel();
            cancelled++;
        }
        for (StockHoldingEntity h : holdingRepository.findAll()) {
            boolean legacy = h.getPositionType() == StockOrderEntity.PositionType.SHORT || (h.getLeverage() != null && h.getLeverage() > 1);
            if (!legacy) continue;
            Quote q = quotes.get(h.getTicker());
            long price = q != null ? q.price() : h.getAvgPrice();
            long diff = h.getPositionType() == StockOrderEntity.PositionType.SHORT ? h.getAvgPrice() - price : price - h.getAvgPrice();
            long value = Math.max(0L, (h.getAvgPrice() + diff * h.getLeverage()) * h.getQuantity());
            walletRepository.findByUserForUpdate(h.getUser()).ifPresent(w -> w.deposit(value));
            holdingRepository.delete(h);
            settled++;
        }
        log.info("주식 개편 데이터 정리: 미체결 {}건 취소·환불, 공매도/레버리지 {}건 정산", cancelled, settled);
    }

    /** 차트가 비어 있지 않도록 과거 일봉·분봉을 현재가에 맞춰 생성 */
    private void seedHistoryIfEmpty(StockEntity s) {
        if (!candleRepository.findRecent(s.getTicker(), StockCandleEntity.Interval.D1, PageRequest.of(0, 1)).isEmpty()) return;
        double mult = volMultiplier(s);
        long now = System.currentTimeMillis();
        long avgVol = avgTickVolume(s);
        List<StockCandleEntity> out = new ArrayList<>();

        // 일봉 120개: 현재가에서 거꾸로 거슬러 올라가며 생성
        double close = s.getPreviousClose();
        long sessionStart = (now / SESSION_MS) * SESSION_MS;
        for (int i = 1; i <= 120; i++) {
            double sigma = BASE_SESSION_VOL * mult;
            double open = close / Math.exp(random.nextGaussian() * sigma);
            double hi = Math.max(open, close) * (1 + Math.abs(random.nextGaussian()) * sigma * 0.4);
            double lo = Math.min(open, close) * (1 - Math.abs(random.nextGaussian()) * sigma * 0.4);
            long vol = (long) (avgVol * TICKS_PER_SESSION * (0.6 + random.nextDouble() * 0.8));
            out.add(new StockCandleEntity(s.getTicker(), StockCandleEntity.Interval.D1, (sessionStart - i * SESSION_MS) / 1000,
                    StockRules.roundToTick(Math.round(open)), StockRules.roundToTick(Math.round(hi)),
                    StockRules.roundToTick(Math.round(lo)), StockRules.roundToTick(Math.round(close)), vol));
            close = open;
        }

        // 분봉 90개
        double mclose = s.getCurrentPrice();
        long minute = minuteStart(now);
        double msigma = BASE_SESSION_VOL * mult / Math.sqrt(60);
        for (int i = 1; i <= 90; i++) {
            double open = mclose / Math.exp(random.nextGaussian() * msigma);
            double hi = Math.max(open, mclose) * (1 + Math.abs(random.nextGaussian()) * msigma * 0.3);
            double lo = Math.min(open, mclose) * (1 - Math.abs(random.nextGaussian()) * msigma * 0.3);
            long vol = (long) (avgVol * 20 * (0.5 + random.nextDouble()));
            out.add(new StockCandleEntity(s.getTicker(), StockCandleEntity.Interval.M1, (minute - i * 60_000L) / 1000,
                    StockRules.roundToTick(Math.round(open)), StockRules.roundToTick(Math.round(hi)),
                    StockRules.roundToTick(Math.round(lo)), StockRules.roundToTick(Math.round(mclose)), vol));
            mclose = open;
        }
        candleRepository.saveAll(out);
    }

    /* ─────────────────────────── 시세 엔진 ─────────────────────────── */

    private static double volMultiplier(StockEntity s) {
        return Math.max(0.3, s.getVolatility() / 0.02);
    }

    private static long avgTickVolume(StockEntity s) {
        long shares = s.getShares() != null ? s.getShares() : 1_000_000L;
        return Math.max(1, Math.round(shares * TURNOVER_PER_SESSION / TICKS_PER_SESSION));
    }

    private static long minuteStart(long ms) {
        return (ms / 60_000L) * 60_000L;
    }

    @Scheduled(fixedRate = TICK_MS)
    @Transactional
    public void tick() {
        List<StockEntity> stocks = stockRepository.findAll();
        if (stocks.isEmpty()) return;
        long now = System.currentTimeMillis();

        // 정시마다 장 마감 → 일봉 저장, 종가를 기준가로
        long session = now / SESSION_MS;
        if (session != sessionIndex) {
            for (StockEntity s : stocks) {
                candleRepository.save(new StockCandleEntity(s.getTicker(), StockCandleEntity.Interval.D1, sessionIndex * SESSION_MS / 1000,
                        s.getDayOpen(), s.getDayHigh(), s.getDayLow(), s.getCurrentPrice(), s.getDayVolume()));
                s.closeSession();
            }
            sessionIndex = session;
            addNews(null, "📢 장 마감 · 새 거래일이 시작되었습니다. 종가가 오늘의 기준가가 됩니다.", "INFO", 0);
        }

        StockEntity newsTarget = random.nextDouble() < 0.015 ? stocks.get(random.nextInt(stocks.size())) : null;
        List<StockDTO.TickResponse> ticks = new ArrayList<>();

        for (StockEntity s : stocks) {
            String ticker = s.getTicker();
            long prev = s.getCurrentPrice();
            double mult = volMultiplier(s);
            double sigma = BASE_SESSION_VOL * mult / Math.sqrt(TICKS_PER_SESSION);

            Trend trend = trends.computeIfAbsent(ticker, k -> new Trend());
            if (trend.remaining-- <= 0) {
                trend.drift = random.nextGaussian() * sigma * 0.25;
                trend.remaining = 100 + random.nextInt(300);
            }
            double fair = s.getFairValue() * Math.exp(random.nextGaussian() * sigma * 0.2);
            double ret = trend.drift + 0.002 * Math.log(fair / prev) + sigma * random.nextGaussian();
            double volBoost = 1.0;

            if (s == newsTarget) {
                boolean good = random.nextBoolean();
                double impact = (0.02 + random.nextDouble() * 0.05) * (good ? 1 : -1);
                fair *= (1 + impact);
                ret += impact * 0.6;
                volBoost = 8.0;
                addNews(s, newsTitle(s, good), good ? "GOOD" : "BAD", Math.round(impact * 10000) / 100.0);
            }
            s.setFairValue(fair);

            long upper = StockRules.upperLimit(s.getPreviousClose());
            long lower = StockRules.lowerLimit(s.getPreviousClose());
            long price = StockRules.roundToTick(Math.round(prev * Math.exp(ret)));
            price = Math.min(upper, Math.max(lower, price));

            long avg = avgTickVolume(s);
            long volume = Math.max(1, Math.round(avg * (0.2 + random.nextDouble() * 1.6)
                    * (1 + Math.abs(ret) / sigma * 0.5) * volBoost)) + userVolume.getOrDefault(ticker, 0L);
            userVolume.remove(ticker);
            s.applyTrade(price, volume);

            String side = price > prev ? "BUY" : price < prev ? "SELL" : (random.nextBoolean() ? "BUY" : "SELL");
            StockDTO.TickResponse t = StockDTO.TickResponse.builder()
                    .ticker(ticker).time(now).price(price).quantity(volume).side(side).build();
            ticks.add(t);
            Deque<StockDTO.TickResponse> dq = recentTicks.computeIfAbsent(ticker, k -> new ArrayDeque<>());
            synchronized (dq) {
                dq.addFirst(t);
                while (dq.size() > RECENT_TICKS) dq.removeLast();
            }

            // 분봉
            long minute = minuteStart(now);
            CandleBuilder cb = minuteCandles.get(ticker);
            if (cb == null || cb.start != minute) {
                if (cb != null) {
                    candleRepository.save(new StockCandleEntity(ticker, StockCandleEntity.Interval.M1, cb.start / 1000,
                            cb.open, cb.high, cb.low, cb.close, cb.volume));
                }
                cb = new CandleBuilder(minute, prev);
                minuteCandles.put(ticker, cb);
            }
            cb.add(price, volume);

            Quote q = new Quote(price, s.getPreviousClose(), avg);
            quotes.put(ticker, q);
            matchPendingOrders(ticker, q);
        }

        try {
            messagingTemplate.convertAndSend("/topic/stock-market", StockDTO.MarketSnapshot.builder()
                    .stocks(stocks.stream().map(this::toItem).toList())
                    .ticks(ticks)
                    .sessionEndsAt((sessionIndex + 1) * SESSION_MS)
                    .serverTime(now)
                    .build());
        } catch (Exception e) {
            log.trace("시세 방송 생략: {}", e.getMessage());
        }
    }

    /** 오래된 봉 정리: 분봉 6시간, 일봉 180일 보관 */
    @Scheduled(fixedDelay = 600_000L, initialDelay = 60_000L)
    @Transactional
    public void cleanupCandles() {
        long nowSec = System.currentTimeMillis() / 1000;
        candleRepository.deleteOlderThan(StockCandleEntity.Interval.M1, nowSec - 6 * 3600);
        candleRepository.deleteOlderThan(StockCandleEntity.Interval.D1, nowSec - 180L * 24 * 3600);
    }

    private StockDTO.StockItemResponse toItem(StockEntity s) {
        long prev = s.getPreviousClose();
        long cur = s.getCurrentPrice();
        long upper = StockRules.upperLimit(prev);
        long lower = StockRules.lowerLimit(prev);
        return StockDTO.StockItemResponse.builder()
                .ticker(s.getTicker()).name(s.getName()).theme(s.getTheme())
                .currentPrice(cur).previousClose(prev)
                .changeAmount(cur - prev)
                .changeRate(prev == 0 ? 0 : Math.round((cur - prev) * 10000.0 / prev) / 100.0)
                .open(s.getDayOpen()).high(s.getDayHigh()).low(s.getDayLow())
                .volume(s.getDayVolume()).tradeValue(s.getDayAmount())
                .upperLimit(upper).lowerLimit(lower).tickSize(StockRules.tickSize(cur))
                .marketCap(s.marketCapNow())
                .upperLimitHit(cur >= upper).lowerLimitHit(cur <= lower)
                .build();
    }

    /* ─────────────────────────── 조회 API ─────────────────────────── */

    @Transactional(readOnly = true)
    public List<StockDTO.StockItemResponse> getAllStocks() {
        return stockRepository.findAll().stream().map(this::toItem).toList();
    }

    public long getSessionEndsAt() {
        return (sessionIndex + 1) * SESSION_MS;
    }

    private StockEntity requireStock(String ticker) {
        return stockRepository.findById(ticker).orElseThrow(() -> new IllegalArgumentException("존재하지 않는 종목입니다."));
    }

    private Quote requireQuote(String ticker) {
        Quote q = quotes.get(ticker);
        if (q == null) throw new IllegalArgumentException("존재하지 않는 종목입니다.");
        return q;
    }

    @Transactional(readOnly = true)
    public List<StockDTO.CandleResponse> getCandles(String ticker, String interval) {
        StockEntity s = requireStock(ticker);
        boolean daily = "D1".equalsIgnoreCase(interval);
        StockCandleEntity.Interval iv = daily ? StockCandleEntity.Interval.D1 : StockCandleEntity.Interval.M1;
        List<StockCandleEntity> rows = new ArrayList<>(candleRepository.findRecent(ticker, iv, PageRequest.of(0, daily ? 150 : 240)));
        Collections.reverse(rows);
        List<StockDTO.CandleResponse> out = rows.stream().map(c -> StockDTO.CandleResponse.builder()
                .time(c.getStartTime()).open(c.getOpen()).high(c.getHigh()).low(c.getLow()).close(c.getClose()).volume(c.getVolume())
                .build()).collect(Collectors.toCollection(ArrayList::new));

        // 진행 중인 봉
        if (daily) {
            out.add(StockDTO.CandleResponse.builder().time(sessionIndex * SESSION_MS / 1000)
                    .open(s.getDayOpen()).high(s.getDayHigh()).low(s.getDayLow()).close(s.getCurrentPrice()).volume(s.getDayVolume()).build());
        } else {
            CandleBuilder cb = minuteCandles.get(ticker);
            if (cb != null) {
                out.add(StockDTO.CandleResponse.builder().time(cb.start / 1000)
                        .open(cb.open).high(cb.high).low(cb.low).close(cb.close).volume(cb.volume).build());
            }
        }
        return out;
    }

    public List<StockDTO.TickResponse> getRecentTicks(String ticker) {
        Deque<StockDTO.TickResponse> dq = recentTicks.get(ticker);
        if (dq == null) return List.of();
        synchronized (dq) {
            return new ArrayList<>(dq);
        }
    }

    /**
     * 10단 호가: 시장 참여자 잔량(시뮬레이션) + 실제 미체결 주문
     * 잔량은 몇 초 동안 같은 값이 유지되도록 시드 고정
     */
    @Transactional(readOnly = true)
    public StockDTO.OrderBookResponse getOrderBook(String ticker, UserEntity viewer) {
        Quote q = requireQuote(ticker);
        Map<String, Long> real = new HashMap<>();
        for (Object[] row : orderRepository.sumPendingByPrice(ticker)) {
            real.merge(row[0] + ":" + row[1], ((Number) row[2]).longValue(), Long::sum);
        }
        Map<String, Long> mine = new HashMap<>();
        if (viewer != null) {
            for (StockOrderEntity o : orderRepository.findByUserAndOrderStatusOrderByCreatedAtDesc(viewer, PENDING)) {
                if (o.getTicker().equals(ticker)) mine.merge(o.getTradeType() + ":" + o.getTargetPrice(), o.getQuantity(), Long::sum);
            }
        }
        Random r = new Random(ticker.hashCode() * 31L + q.price() * 7 + System.currentTimeMillis() / 6000);

        List<StockDTO.OrderBookItem> asks = new ArrayList<>();
        long p = q.bestAsk();
        for (int i = 0; i < 10 && p != Long.MAX_VALUE && p <= q.upper(); i++, p = StockRules.tickUp(p)) {
            long sim = Math.round(q.tickVolume() * (2 + i * 1.2) * (0.4 + r.nextDouble() * 1.2));
            asks.add(StockDTO.OrderBookItem.builder().price(p)
                    .quantity(sim + real.getOrDefault("SELL:" + p, 0L)).myQuantity(mine.getOrDefault("SELL:" + p, 0L)).build());
        }
        Collections.reverse(asks); // 화면 위쪽이 높은 가격

        List<StockDTO.OrderBookItem> bids = new ArrayList<>();
        p = q.bestBid();
        for (int i = 0; i < 10 && p >= q.lower() && p > 0; i++, p = StockRules.tickDown(p)) {
            long sim = Math.round(q.tickVolume() * (2 + i * 1.2) * (0.4 + r.nextDouble() * 1.2));
            bids.add(StockDTO.OrderBookItem.builder().price(p)
                    .quantity(sim + real.getOrDefault("BUY:" + p, 0L)).myQuantity(mine.getOrDefault("BUY:" + p, 0L)).build());
            if (p == 1) break;
        }

        return StockDTO.OrderBookResponse.builder()
                .ticker(ticker).currentPrice(q.price()).previousClose(q.previousClose())
                .asks(asks).bids(bids)
                .totalAsk(asks.stream().mapToLong(StockDTO.OrderBookItem::getQuantity).sum())
                .totalBid(bids.stream().mapToLong(StockDTO.OrderBookItem::getQuantity).sum())
                .build();
    }

    @Transactional(readOnly = true)
    public StockDTO.CompanyDetailResponse getCompanyDetail(String ticker) {
        StockEntity s = requireStock(ticker);
        return StockDTO.CompanyDetailResponse.builder()
                .ticker(s.getTicker()).name(s.getName())
                .currentPrice(s.getCurrentPrice()).previousClose(s.getPreviousClose())
                .marketCap(s.marketCapNow()).shares(s.getShares() != null ? s.getShares() : 0)
                .per(s.getPer()).pbr(s.getPbr()).theme(s.getTheme()).description(s.getDescription())
                .build();
    }

    public List<StockDTO.StockNewsResponse> getRecentNews() {
        synchronized (recentNews) {
            return new ArrayList<>(recentNews);
        }
    }

    private String newsTitle(StockEntity s, boolean good) {
        String n = s.getName();
        String[] goods = {
                n + ", 대규모 공급 계약 체결 공시",
                n + ", 분기 영업이익 시장 예상치 상회",
                n + ", 신규 특허 등록 및 신사업 진출 발표",
                "외국인·기관, " + n + " 동반 순매수",
                n + ", 자사주 매입 결정 공시",
        };
        String[] bads = {
                n + ", 주요 공급망 차질로 생산 지연",
                n + ", 분기 실적 시장 예상치 하회",
                n + ", 규제 당국 조사 착수 소식",
                "대주주 " + n + " 지분 일부 매도 공시",
                n + ", 유상증자 결정에 물량 부담 우려",
        };
        return good ? goods[random.nextInt(goods.length)] : bads[random.nextInt(bads.length)];
    }

    private void addNews(StockEntity s, String title, String type, double impact) {
        StockDTO.StockNewsResponse news = StockDTO.StockNewsResponse.builder()
                .id(UUID.randomUUID().toString())
                .ticker(s != null ? s.getTicker() : null)
                .stockName(s != null ? s.getName() : "시장")
                .title(title).newsType(type).priceImpactPercent(impact)
                .createdAt(LocalDateTime.now())
                .build();
        synchronized (recentNews) {
            recentNews.add(0, news);
            while (recentNews.size() > 30) recentNews.remove(recentNews.size() - 1);
        }
        try {
            messagingTemplate.convertAndSend("/topic/stock-news", news);
        } catch (Exception e) {
            log.trace("뉴스 방송 생략: {}", e.getMessage());
        }
    }

    /* ─────────────────────────── 주문·체결 ─────────────────────────── */

    private StockWalletEntity lockWallet(UserEntity user) {
        return walletRepository.findByUserForUpdate(user).orElseGet(() -> {
            walletRepository.saveAndFlush(StockWalletEntity.builder().user(user).cash(INITIAL_CASH).build());
            return walletRepository.findByUserForUpdate(user).orElseThrow();
        });
    }

    private Optional<StockHoldingEntity> findHolding(UserEntity user, String ticker) {
        return holdingRepository.findByUserAndTickerAndPositionTypeAndLeverage(user, ticker, StockOrderEntity.PositionType.LONG, 1);
    }

    private long sellableQuantity(UserEntity user, String ticker) {
        long held = findHolding(user, ticker).map(StockHoldingEntity::getQuantity).orElse(0L);
        return held - orderRepository.sumPendingQuantity(user, ticker, SELL);
    }

    @Transactional
    public StockDTO.OrderResult createOrder(UserEntity user, StockDTO.OrderRequest req) {
        if (req.getTicker() == null || req.getTradeType() == null) throw new IllegalArgumentException("주문 정보가 올바르지 않습니다.");
        String ticker = req.getTicker().toUpperCase();
        long qty = req.getQuantity();
        if (qty < 1 || qty > 1_000_000) throw new IllegalArgumentException("주문 수량은 1주 이상 1,000,000주 이하여야 합니다.");
        boolean market = req.getOrderType() != StockOrderEntity.OrderType.LIMIT;

        StockWalletEntity wallet = lockWallet(user); // 이 사용자의 잔고 변경을 직렬화
        Quote q = requireQuote(ticker);

        if (req.getTradeType() == BUY) {
            long limit;
            if (market) {
                if (q.bestAsk() == Long.MAX_VALUE) throw new IllegalStateException("상한가로 매도 잔량이 없습니다. 지정가로 주문하세요.");
                limit = q.bestAsk();
            } else {
                limit = validateLimitPrice(req.getPrice(), q);
            }
            // 즉시 체결 가능: 매도1호가 이하로 살 수 있으면 매도1호가에 체결
            if (q.bestAsk() <= limit) {
                long price = q.bestAsk();
                long cost = price * qty + StockRules.fee(price * qty);
                if (wallet.getCash() < cost) throw new IllegalStateException(insufficientCash(wallet.getCash(), price));
                wallet.withdraw(cost);
                fillBuy(user, ticker, qty, price);
                return StockDTO.OrderResult.builder().filled(true).fillPrice(price)
                        .message(String.format("매수 체결: %,d원 × %,d주", price, qty)).build();
            }
            long reserve = limit * qty + StockRules.fee(limit * qty);
            if (wallet.getCash() < reserve) throw new IllegalStateException(insufficientCash(wallet.getCash(), limit));
            wallet.withdraw(reserve);
            orderRepository.save(StockOrderEntity.builder().user(user).ticker(ticker).tradeType(BUY)
                    .positionType(StockOrderEntity.PositionType.LONG).leverage(1)
                    .orderType(StockOrderEntity.OrderType.LIMIT).targetPrice(limit).quantity(qty).reservedCash(reserve).build());
            return StockDTO.OrderResult.builder().filled(false)
                    .message(String.format("매수 주문 접수: %,d원 × %,d주 (미체결)", limit, qty)).build();
        }

        // 매도
        long sellable = sellableQuantity(user, ticker);
        if (qty > sellable) throw new IllegalStateException(String.format("매도가능수량(%,d주)을 넘었습니다.", Math.max(0, sellable)));
        long limit;
        if (market) {
            if (q.bestBid() == 0) throw new IllegalStateException("하한가로 매수 잔량이 없습니다. 지정가로 주문하세요.");
            limit = q.bestBid();
        } else {
            limit = validateLimitPrice(req.getPrice(), q);
        }
        if (q.bestBid() > 0 && q.bestBid() >= limit) {
            long price = q.bestBid();
            long proceeds = fillSell(user, ticker, qty, price);
            wallet.deposit(proceeds);
            return StockDTO.OrderResult.builder().filled(true).fillPrice(price)
                    .message(String.format("매도 체결: %,d원 × %,d주", price, qty)).build();
        }
        orderRepository.save(StockOrderEntity.builder().user(user).ticker(ticker).tradeType(SELL)
                .positionType(StockOrderEntity.PositionType.LONG).leverage(1)
                .orderType(StockOrderEntity.OrderType.LIMIT).targetPrice(limit).quantity(qty).reservedCash(0L).build());
        return StockDTO.OrderResult.builder().filled(false)
                .message(String.format("매도 주문 접수: %,d원 × %,d주 (미체결)", limit, qty)).build();
    }

    private String insufficientCash(long cash, long price) {
        long max = (long) Math.floor(cash / (price * (1 + StockRules.FEE_RATE)));
        return String.format("주문가능금액이 부족합니다. (최대 %,d주)", Math.max(0, max));
    }

    private long validateLimitPrice(Long price, Quote q) {
        if (price == null || price <= 0) throw new IllegalArgumentException("주문 가격을 입력하세요.");
        if (!StockRules.isOnTick(price)) {
            throw new IllegalArgumentException(String.format("호가 단위(%,d원)에 맞지 않는 가격입니다.", StockRules.tickSize(price)));
        }
        if (price > q.upper() || price < q.lower()) {
            throw new IllegalArgumentException(String.format("가격제한폭(%,d ~ %,d원)을 벗어났습니다.", q.lower(), q.upper()));
        }
        return price;
    }

    /** 매수 체결: 보유 반영 + 체결 기록 (대금은 호출 측에서 처리) */
    private void fillBuy(UserEntity user, String ticker, long qty, long price) {
        StockHoldingEntity h = findHolding(user, ticker).orElseGet(() -> StockHoldingEntity.builder()
                .user(user).ticker(ticker).positionType(StockOrderEntity.PositionType.LONG).leverage(1)
                .quantity(0L).avgPrice(0L).build());
        h.addPosition(qty, price);
        holdingRepository.save(h);
        tradeRepository.save(StockTradeEntity.builder().user(user).ticker(ticker).tradeType(BUY)
                .quantity(qty).price(price).fee(StockRules.fee(price * qty)).build());
        userVolume.merge(ticker, qty, Long::sum);
    }

    /** 매도 체결: 보유 차감 + 체결 기록, 반환값 = 수수료·세금을 뺀 입금액 */
    private long fillSell(UserEntity user, String ticker, long qty, long price) {
        StockHoldingEntity h = findHolding(user, ticker).orElseThrow(() -> new IllegalStateException("보유 수량이 없습니다."));
        if (h.getQuantity() < qty) throw new IllegalStateException("보유 수량이 부족합니다.");
        h.reducePosition(qty);
        if (h.getQuantity() <= 0) holdingRepository.delete(h);
        long amount = price * qty;
        long cost = StockRules.fee(amount) + StockRules.tax(amount);
        tradeRepository.save(StockTradeEntity.builder().user(user).ticker(ticker).tradeType(SELL)
                .quantity(qty).price(price).fee(cost).build());
        userVolume.merge(ticker, qty, Long::sum);
        return amount - cost;
    }

    /** 틱마다: 가격이 닿은 지정가 주문을 지정가로 체결 */
    private void matchPendingOrders(String ticker, Quote q) {
        for (StockOrderEntity snapshot : orderRepository.findByTickerAndOrderStatusOrderByCreatedAtAsc(ticker, PENDING)) {
            boolean hit = snapshot.getTradeType() == BUY
                    ? q.bestAsk() <= snapshot.getTargetPrice()
                    : q.bestBid() > 0 && q.bestBid() >= snapshot.getTargetPrice();
            if (!hit) continue;

            UserEntity user = snapshot.getUser();
            StockWalletEntity wallet = lockWallet(user);
            StockOrderEntity order = orderRepository.findByIdForUpdate(snapshot.getId()).orElse(null);
            if (order == null || order.getOrderStatus() != PENDING) continue; // 그 사이 취소됨

            long price = order.getTargetPrice();
            long qty = order.getQuantity();
            if (order.getTradeType() == BUY) {
                long cost = price * qty + StockRules.fee(price * qty);
                long reserved = order.getReservedCash() != null ? order.getReservedCash() : cost;
                fillBuy(user, ticker, qty, price);
                wallet.deposit(Math.max(0, reserved - cost));
            } else {
                long held = findHolding(user, ticker).map(StockHoldingEntity::getQuantity).orElse(0L);
                if (held < qty) {
                    order.cancel();
                    continue;
                }
                wallet.deposit(fillSell(user, ticker, qty, price));
            }
            order.markAsFilled(LocalDateTime.now());
        }
    }

    @Transactional
    public void cancelOrder(UserEntity user, Long orderId) {
        StockWalletEntity wallet = lockWallet(user);
        StockOrderEntity order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 주문입니다."));
        if (!order.getUser().getId().equals(user.getId())) throw new IllegalStateException("본인의 주문만 취소할 수 있습니다.");
        if (order.getOrderStatus() != PENDING) throw new IllegalStateException("이미 체결되었거나 취소된 주문입니다.");
        if (order.getTradeType() == BUY) {
            wallet.deposit(order.getReservedCash() != null ? order.getReservedCash() : order.getTargetPrice() * order.getQuantity());
        }
        order.cancel();
    }

    /* ─────────────────────────── 계좌 ─────────────────────────── */

    private long priceOf(String ticker, long fallback) {
        Quote q = quotes.get(ticker);
        return q != null ? q.price() : fallback;
    }

    @Transactional
    public StockDTO.WalletResponse getWallet(UserEntity user) {
        long cash = walletRepository.findByUser(user).map(StockWalletEntity::getCash).orElse(INITIAL_CASH);
        long reserved = orderRepository.sumReservedCash(user);
        long purchase = 0, eval = 0;
        for (StockHoldingEntity h : holdingRepository.findByUser(user)) {
            purchase += h.getAvgPrice() * h.getQuantity();
            eval += priceOf(h.getTicker(), h.getAvgPrice()) * h.getQuantity();
        }
        long total = cash + reserved + eval;
        return StockDTO.WalletResponse.builder()
                .cash(cash).reservedCash(reserved).purchaseAmount(purchase).evaluation(eval)
                .evalProfit(eval - purchase).totalAsset(total).initialCash(INITIAL_CASH)
                .totalReturnRate(Math.round((total - INITIAL_CASH) * 10000.0 / INITIAL_CASH) / 100.0)
                .build();
    }

    @Transactional(readOnly = true)
    public List<StockDTO.HoldingResponse> getHoldings(UserEntity user) {
        Map<String, String> names = stockRepository.findAll().stream().collect(Collectors.toMap(StockEntity::getTicker, StockEntity::getName));
        List<StockDTO.HoldingResponse> out = new ArrayList<>();
        for (StockHoldingEntity h : holdingRepository.findByUser(user)) {
            if (h.getQuantity() <= 0) continue;
            long cur = priceOf(h.getTicker(), h.getAvgPrice());
            long purchase = h.getAvgPrice() * h.getQuantity();
            long eval = cur * h.getQuantity();
            out.add(StockDTO.HoldingResponse.builder()
                    .ticker(h.getTicker()).stockName(names.getOrDefault(h.getTicker(), h.getTicker()))
                    .quantity(h.getQuantity())
                    .sellableQuantity(h.getQuantity() - orderRepository.sumPendingQuantity(user, h.getTicker(), SELL))
                    .avgPrice(h.getAvgPrice()).currentPrice(cur)
                    .purchaseAmount(purchase).evaluation(eval).profit(eval - purchase)
                    .returnRate(purchase > 0 ? Math.round((eval - purchase) * 10000.0 / purchase) / 100.0 : 0)
                    .build());
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<StockDTO.PendingOrderResponse> getPendingOrders(UserEntity user) {
        Map<String, String> names = stockRepository.findAll().stream().collect(Collectors.toMap(StockEntity::getTicker, StockEntity::getName));
        return orderRepository.findByUserAndOrderStatusOrderByCreatedAtDesc(user, PENDING).stream()
                .map(o -> StockDTO.PendingOrderResponse.builder()
                        .orderId(o.getId()).ticker(o.getTicker()).stockName(names.getOrDefault(o.getTicker(), o.getTicker()))
                        .tradeType(o.getTradeType().name()).price(o.getTargetPrice()).quantity(o.getQuantity())
                        .createdAt(o.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StockDTO.TradeHistoryResponse> getTradeHistory(UserEntity user) {
        Map<String, String> names = stockRepository.findAll().stream().collect(Collectors.toMap(StockEntity::getTicker, StockEntity::getName));
        return tradeRepository.findTop50ByUserOrderByTradedAtDesc(user).stream()
                .map(t -> StockDTO.TradeHistoryResponse.builder()
                        .id(t.getId()).ticker(t.getTicker()).stockName(names.getOrDefault(t.getTicker(), t.getTicker()))
                        .tradeType(t.getTradeType().name()).quantity(t.getQuantity()).price(t.getPrice())
                        .amount(t.getPrice() * t.getQuantity()).fee(t.getFee()).tradedAt(t.getTradedAt())
                        .build())
                .toList();
    }

    /** 총자산 랭킹 (10초 캐시) */
    @Transactional(readOnly = true)
    public List<StockDTO.LeaderboardResponse> getLeaderboard() {
        if (System.currentTimeMillis() - leaderboardAt < 10_000L) return leaderboardCache;

        Map<Long, Long> eval = new HashMap<>();
        for (StockHoldingEntity h : holdingRepository.findAll()) {
            eval.merge(h.getUser().getId(), priceOf(h.getTicker(), h.getAvgPrice()) * h.getQuantity(), Long::sum);
        }
        Map<Long, Long> reserved = new HashMap<>();
        for (StockOrderEntity o : orderRepository.findByOrderStatus(PENDING)) {
            if (o.getTradeType() == BUY && o.getReservedCash() != null) reserved.merge(o.getUser().getId(), o.getReservedCash(), Long::sum);
        }
        List<StockDTO.LeaderboardResponse> list = new ArrayList<>();
        for (StockWalletEntity w : walletRepository.findAll()) {
            UserEntity u = w.getUser();
            long total = w.getCash() + eval.getOrDefault(u.getId(), 0L) + reserved.getOrDefault(u.getId(), 0L);
            list.add(StockDTO.LeaderboardResponse.builder()
                    .userId(u.getId())
                    .nickname(u.getNickname() != null ? u.getNickname() : "익명")
                    .totalAsset(total)
                    .returnRate(Math.round((total - INITIAL_CASH) * 10000.0 / INITIAL_CASH) / 100.0)
                    .build());
        }
        list.sort((a, b) -> Long.compare(b.getTotalAsset(), a.getTotalAsset()));
        leaderboardCache = list.stream().limit(20).toList();
        leaderboardAt = System.currentTimeMillis();
        return leaderboardCache;
    }
}
