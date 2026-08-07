package kr.pe.tn.domain.stock.service;

import kr.pe.tn.domain.stock.dto.StockDTO;
import kr.pe.tn.domain.stock.entity.*;
import kr.pe.tn.domain.stock.repository.*;
import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.repository.UserRepository;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StockService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(StockService.class);
    private final StockRepository stockRepository;
    private final StockPriceHistoryRepository historyRepository;
    private final StockWalletRepository walletRepository;
    private final StockHoldingRepository holdingRepository;
    private final StockTradeRepository tradeRepository;
    private final StockOrderRepository orderRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private static final long INITIAL_CASH = 1_000_000L;

    private final Map<String, StockTrendState> trendStateMap = new ConcurrentHashMap<>();
    private final Map<String, LocalDateTime> circuitBreakerMap = new ConcurrentHashMap<>();
    private final List<StockDTO.StockNewsResponse> recentNewsList = Collections.synchronizedList(new ArrayList<>());

    @Getter
    public static class StockTrendState {
        private int direction; // 1: 상승, -1: 하락, 0: 횡보
        private int remainingTicks;
        private double bias;

        public int getDirection() { return direction; }
        public int getRemainingTicks() { return remainingTicks; }
        public double getBias() { return bias; }

        public StockTrendState(int direction, int remainingTicks, double bias) {
            this.direction = direction;
            this.remainingTicks = remainingTicks;
            this.bias = bias;
        }

        public void decrementTick() {
            this.remainingTicks--;
        }
    }

    /**
     * 가상 종목 초기화 및 재무 데이터 구축
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initStocks() {
        if (stockRepository.count() == 0) {
            List<StockEntity> initialStocks = List.of(
                    StockEntity.builder().ticker("NEXUS").name("TerminalNexus Corp").currentPrice(50000L).previousClose(50000L).volatility(0.015)
                            .marketCap(1_500_000_000_000L).per(18.5).pbr(2.1).theme("AI플랫폼 / 터미널").description("개발자 및 파워유저를 위한 차세대 통합 터미널 플랫폼 독점 공급 기업.").build(),

                    StockEntity.builder().ticker("HACK").name("HackerMode Inc").currentPrice(12000L).previousClose(12000L).volatility(0.035)
                            .marketCap(360_000_000_000L).per(42.0).pbr(5.4).theme("사이버보안 / 해킹").description("지능형 침투 탐지 솔루션 및 글로벌 사이버 보안 침해 예방 기술 전문 회사.").build(),

                    StockEntity.builder().ticker("FORGE").name("ForgeStone Ltd").currentPrice(85000L).previousClose(85000L).volatility(0.008)
                            .marketCap(3_200_000_000_000L).per(12.2).pbr(1.4).theme("게이밍 / 강하시뮬").description("확률형 롤플레잉 게임 엔진 및 초고강도 아이템 강화 물리 엔진 개발사.").build(),

                    StockEntity.builder().ticker("LOTTO").name("LuckyDraw Co").currentPrice(3000L).previousClose(3000L).volatility(0.060)
                            .marketCap(90_000_000_000L).per(88.0).pbr(9.2).theme("확률엔터 / 추첨").description("초고변동성 확률 알고리즘 기반 복권 및 럭키 드로우 서비스를 운영하는 엔터 기업.").build(),

                    StockEntity.builder().ticker("CHAT").name("TalkBridge Corp").currentPrice(28000L).previousClose(28000L).volatility(0.020)
                            .marketCap(840_000_000_000L).per(24.1).pbr(3.0).theme("메신저 / 웹소켓").description("초저지연 실시간 메시징 프로토콜 및 대규모 분산 채팅 서버 기술 인프라 기업.").build(),

                    StockEntity.builder().ticker("FRUIT").name("FruitAI Systems").currentPrice(120000L).previousClose(120000L).volatility(0.010)
                            .marketCap(4_800_000_000_000L).per(15.8).pbr(2.8).theme("딥러닝 / 비전AI").description("컴퓨터 비전 딥러닝 기반 과일 및 농산물 품질 자동 감정 AI 시스템 선도기업.").build(),

                    StockEntity.builder().ticker("TYPE").name("TypeSpeed Inc").currentPrice(7500L).previousClose(7500L).volatility(0.040)
                            .marketCap(225_000_000_000L).per(31.5).pbr(4.1).theme("타자 / e스포츠").description("글로벌 온라인 타자 배틀 리그 플랫폼 및 e스포츠 데이터 분석 소프트웨어 제조사.").build(),

                    StockEntity.builder().ticker("GHOST").name("GhostNet Corp").currentPrice(45000L).previousClose(45000L).volatility(0.025)
                            .marketCap(1_350_000_000_000L).per(21.0).pbr(2.5).theme("다크웹 / 네트워크").description("익명 네트워크 터널링 및 차세대 암호화 데이터 통신 솔루션 개발업체.").build()
            );
            stockRepository.saveAll(initialStocks);
            log.info("가상 주식 8개 종목 초기 등록 완료");

            for (StockEntity stock : initialStocks) {
                historyRepository.save(StockPriceHistoryEntity.builder()
                        .ticker(stock.getTicker())
                        .price(stock.getCurrentPrice())
                        .build());
            }
        }
    }

    /**
     * 전체 종목 시세 목록 반환 (API 컨트롤러용)
     */
    @Transactional(readOnly = true)
    public List<StockDTO.StockItemResponse> getAllStocks() {
        return stockRepository.findAll().stream()
                .map(stock -> buildStockResponse(stock, isCircuitBreaker(stock.getTicker())))
                .collect(Collectors.toList());
    }

    private boolean isCircuitBreaker(String ticker) {
        LocalDateTime expiry = circuitBreakerMap.get(ticker);
        return expiry != null && LocalDateTime.now().isBefore(expiry);
    }

    private StockDTO.StockItemResponse buildStockResponse(StockEntity stock, boolean isCB) {
        long prev = stock.getPreviousClose();
        long cur = stock.getCurrentPrice();
        long diff = cur - prev;
        double rate = prev == 0 ? 0 : ((double) diff / prev) * 100;
        rate = Math.round(rate * 100.0) / 100.0;

        StockTrendState trend = trendStateMap.get(stock.getTicker());
        String trendStr = trend == null ? "SIDEWAYS" : (trend.getDirection() > 0 ? "BULL" : (trend.getDirection() < 0 ? "BEAR" : "SIDEWAYS"));

        return StockDTO.StockItemResponse.builder()
                .ticker(stock.getTicker())
                .name(stock.getName())
                .currentPrice(cur)
                .previousClose(prev)
                .volatility(stock.getVolatility())
                .changeRate(rate)
                .changeAmount(diff)
                .isUpperLimit(cur >= Math.round(prev * 1.30))
                .isLowerLimit(cur <= Math.round(prev * 0.70))
                .isCircuitBreaker(isCB)
                .currentTrend(trendStr)
                .build();
    }

    /**
     * 3초마다 주가 시뮬레이션 + 미체결 지정가 주문 자동 체결 Engine
     */
    @Scheduled(fixedRate = 3000)
    @Transactional
    public void simulatePriceChanges() {
        List<StockEntity> stocks = stockRepository.findAll();
        if (stocks.isEmpty()) return;

        Random random = new Random();

        if (random.nextDouble() < 0.08) {
            generateNewsEvent(stocks, random);
        }

        List<StockDTO.StockItemResponse> updatedPrices = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (StockEntity stock : stocks) {
            String ticker = stock.getTicker();

            if (circuitBreakerMap.containsKey(ticker)) {
                if (now.isBefore(circuitBreakerMap.get(ticker))) {
                    updatedPrices.add(buildStockResponse(stock, true));
                    continue;
                } else {
                    circuitBreakerMap.remove(ticker);
                }
            }

            StockTrendState trend = trendStateMap.compute(ticker, (k, v) -> {
                if (v == null || v.getRemainingTicks() <= 0) {
                    double rand = random.nextDouble();
                    int dir = rand < 0.42 ? 1 : (rand < 0.84 ? -1 : 0);
                    int ticks = random.nextInt(10) + 5;
                    double bias = (random.nextDouble() * 0.5 + 0.5) * dir;
                    return new StockTrendState(dir, ticks, bias);
                }
                v.decrementTick();
                return v;
            });

            double volatility = stock.getVolatility();
            double noise = (random.nextDouble() * 2 - 1) * volatility;
            double trendFactor = trend.getBias() * volatility * 0.8;
            double changePercent = noise + trendFactor;

            long currentPrice = stock.getCurrentPrice();
            long priceDelta = Math.round(currentPrice * changePercent);

            if (Math.abs(changePercent) >= 0.08) {
                circuitBreakerMap.put(ticker, now.plusSeconds(15));
                log.info("🚨 [{}] 서킷브레이커 발동!", ticker);

                StockDTO.StockNewsResponse cbNews = StockDTO.StockNewsResponse.builder()
                        .id(UUID.randomUUID().toString())
                        .ticker(ticker)
                        .stockName(stock.getName())
                        .title("🚨 " + stock.getName() + " 주가 급변동! 서킷브레이커 발동 (15초간 매매정지)")
                        .newsType(changePercent > 0 ? "GOOD" : "BAD")
                        .priceImpactPercent(Math.round(changePercent * 100.0) / 100.0)
                        .createdAt(now)
                        .build();
                addNews(cbNews);
            }

            long prevClose = stock.getPreviousClose();
            long maxPrice = Math.round(prevClose * 1.30);
            long minPrice = Math.round(prevClose * 0.70);

            long newPrice = Math.max(10L, currentPrice + priceDelta);
            newPrice = Math.min(maxPrice, Math.max(minPrice, newPrice));

            stock.updatePrice(newPrice);

            historyRepository.save(StockPriceHistoryEntity.builder()
                    .ticker(ticker)
                    .price(newPrice)
                    .build());
            historyRepository.deleteOldHistories(ticker);

            // 미체결 지정가 예약 주문 조건 만족 여부 확인 및 자동 체결
            processPendingOrders(stock);

            updatedPrices.add(buildStockResponse(stock, false));
        }

        try {
            messagingTemplate.convertAndSend("/topic/stock-prices", updatedPrices);
        } catch (Exception e) {
            log.trace("웹소켓 시세 전송 생략: {}", e.getMessage());
        }
    }

    /**
     * 미체결 지정가 주문 자동 체결 Engine
     */
    private void processPendingOrders(StockEntity stock) {
        List<StockOrderEntity> pendingOrders = orderRepository.findByOrderStatus(StockOrderEntity.OrderStatus.PENDING);
        long currentPrice = stock.getCurrentPrice();
        LocalDateTime now = LocalDateTime.now();

        for (StockOrderEntity order : pendingOrders) {
            if (!order.getTicker().equals(stock.getTicker())) continue;

            boolean fill = false;
            if (order.getOrderType() == StockOrderEntity.OrderType.LIMIT) {
                if (order.getTradeType() == StockTradeEntity.TradeType.BUY) {
                    // 매수 지정가: 현재가가 목표가 이하이면 체결
                    if (currentPrice <= order.getTargetPrice()) fill = true;
                } else {
                    // 매도 지정가: 현재가가 목표가 이상이면 체결
                    if (currentPrice >= order.getTargetPrice()) fill = true;
                }
            }

            if (fill) {
                executeOrder(order, currentPrice, now);
            }
        }
    }

    /**
     * 주문 체결 실행 (지갑 & 보유 포지션 갱신)
     */
    private void executeOrder(StockOrderEntity order, long fillPrice, LocalDateTime now) {
        UserEntity user = order.getUser();
        StockWalletEntity wallet = getOrCreateWallet(user);
        long totalCost = fillPrice * order.getQuantity();

        if (order.getTradeType() == StockTradeEntity.TradeType.BUY) {
            // 진입
            StockHoldingEntity holding = holdingRepository
                    .findByUserAndTickerAndPositionTypeAndLeverage(user, order.getTicker(), order.getPositionType(), order.getLeverage())
                    .orElseGet(() -> StockHoldingEntity.builder()
                            .user(user)
                            .ticker(order.getTicker())
                            .positionType(order.getPositionType())
                            .leverage(order.getLeverage())
                            .quantity(0L)
                            .avgPrice(0L)
                            .build());

            holding.addPosition(order.getQuantity(), fillPrice);
            holdingRepository.save(holding);
        } else {
            // 청산 (매도)
            StockHoldingEntity holding = holdingRepository
                    .findByUserAndTickerAndPositionTypeAndLeverage(user, order.getTicker(), order.getPositionType(), order.getLeverage())
                    .orElse(null);

            if (holding != null) {
                // 수익금 계산 (LONG: 주가상승 수익, SHORT: 주가하락 수익, 레버리지 1x/2x 적용)
                long priceDiff = fillPrice - holding.getAvgPrice();
                if (order.getPositionType() == StockOrderEntity.PositionType.SHORT) {
                    priceDiff = holding.getAvgPrice() - fillPrice;
                }
                long pnlPerShare = priceDiff * order.getLeverage();
                long totalSettlement = (holding.getAvgPrice() + pnlPerShare) * order.getQuantity();
                totalSettlement = Math.max(0L, totalSettlement); // 마이너스 정산 방지

                wallet.deposit(totalSettlement);

                holding.reducePosition(order.getQuantity());
                if (holding.getQuantity() <= 0) {
                    holdingRepository.delete(holding);
                } else {
                    holdingRepository.save(holding);
                }
            }
        }

        order.markAsFilled(now);
        orderRepository.save(order);

        // 거래 기록 저장
        tradeRepository.save(StockTradeEntity.builder()
                .user(user)
                .ticker(order.getTicker())
                .tradeType(order.getTradeType())
                .quantity(order.getQuantity())
                .price(fillPrice)
                .build());
    }

    /**
     * 10호가창 (Order Book) 산출기
     */
    @Transactional(readOnly = true)
    public StockDTO.OrderBookResponse getOrderBook(String ticker) {
        StockEntity stock = stockRepository.findById(ticker)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 종목입니다."));

        long cur = stock.getCurrentPrice();
        List<StockDTO.OrderBookItem> askOrders = new ArrayList<>(); // 매도 호가 5단계
        List<StockDTO.OrderBookItem> bidOrders = new ArrayList<>(); // 매수 호가 5단계

        Random rand = new Random(ticker.hashCode() + cur);

        // 매도 호가 (+0.5% ~ +2.5%)
        for (int i = 5; i >= 1; i--) {
            long price = Math.round(cur * (1 + i * 0.005));
            long qty = (rand.nextInt(150) + 10) * 10L;
            askOrders.add(StockDTO.OrderBookItem.builder().price(price).quantity(qty).ratio((double) qty / 2000 * 100).build());
        }

        // 매수 호가 (-0.5% ~ -2.5%)
        for (int i = 1; i <= 5; i++) {
            long price = Math.max(10L, Math.round(cur * (1 - i * 0.005)));
            long qty = (rand.nextInt(150) + 10) * 10L;
            bidOrders.add(StockDTO.OrderBookItem.builder().price(price).quantity(qty).ratio((double) qty / 2000 * 100).build());
        }

        return StockDTO.OrderBookResponse.builder()
                .ticker(ticker)
                .currentPrice(cur)
                .askOrders(askOrders)
                .bidOrders(bidOrders)
                .build();
    }

    /**
     * 캔들스틱 (OHLC 봉차트) 데이터 생성
     */
    @Transactional(readOnly = true)
    public List<StockDTO.CandleResponse> getCandles(String ticker) {
        List<StockPriceHistoryEntity> histories = historyRepository.findByTickerOrderByRecordedAtAsc(ticker);
        List<StockDTO.CandleResponse> candles = new ArrayList<>();

        if (histories.isEmpty()) return candles;

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm:ss");

        // 5개 히스토리 단위를 1개의 캔들(봉)로 묶기
        int candleGroupSize = Math.max(1, histories.size() / 15);
        for (int i = 0; i < histories.size(); i += candleGroupSize) {
            int end = Math.min(histories.size(), i + candleGroupSize);
            List<StockPriceHistoryEntity> subList = histories.subList(i, end);

            long open = subList.get(0).getPrice();
            long close = subList.get(subList.size() - 1).getPrice();
            long high = subList.stream().mapToLong(StockPriceHistoryEntity::getPrice).max().orElse(open);
            long low = subList.stream().mapToLong(StockPriceHistoryEntity::getPrice).min().orElse(open);
            String time = subList.get(subList.size() - 1).getRecordedAt() != null ?
                    subList.get(subList.size() - 1).getRecordedAt().format(formatter) : "";

            candles.add(StockDTO.CandleResponse.builder()
                    .open(open)
                    .high(high)
                    .low(low)
                    .close(close)
                    .time(time)
                    .build());
        }

        return candles;
    }

    /**
     * 기업 상세 및 재무 정보 조회
     */
    @Transactional(readOnly = true)
    public StockDTO.CompanyDetailResponse getCompanyDetail(String ticker) {
        StockEntity stock = stockRepository.findById(ticker)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 종목입니다."));

        return StockDTO.CompanyDetailResponse.builder()
                .ticker(stock.getTicker())
                .name(stock.getName())
                .currentPrice(stock.getCurrentPrice())
                .previousClose(stock.getPreviousClose())
                .marketCap(stock.getMarketCap())
                .per(stock.getPer())
                .pbr(stock.getPbr())
                .theme(stock.getTheme())
                .description(stock.getDescription())
                .volatility(stock.getVolatility())
                .build();
    }

    /**
     * 주문 접수 (시장가 / 지정가, LONG / SHORT, 1x / 2x 레버리지)
     */
    @Transactional
    public void createOrder(UserEntity user, StockDTO.OrderRequest request) {
        String ticker = request.getTicker().toUpperCase();
        if (request.getQuantity() <= 0) {
            throw new IllegalArgumentException("주문 수량은 1주 이상이어야 합니다.");
        }

        if (circuitBreakerMap.containsKey(ticker) && LocalDateTime.now().isBefore(circuitBreakerMap.get(ticker))) {
            throw new IllegalStateException("해당 종목은 현재 서킷브레이커 발동 중으로 주문이 불가능합니다.");
        }

        StockEntity stock = stockRepository.findById(ticker)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 종목입니다."));

        StockWalletEntity wallet = getOrCreateWallet(user);
        long targetPrice = request.getOrderType() == StockOrderEntity.OrderType.MARKET ? stock.getCurrentPrice() : request.getTargetPrice();
        long requiredCash = targetPrice * request.getQuantity();

        if (request.getTradeType() == StockTradeEntity.TradeType.BUY) {
            if (wallet.getCash() < requiredCash) {
                throw new IllegalStateException("보유 현금이 부족합니다.");
            }
            wallet.withdraw(requiredCash);
        }

        StockOrderEntity order = StockOrderEntity.builder()
                .user(user)
                .ticker(ticker)
                .tradeType(request.getTradeType())
                .positionType(request.getPositionType() != null ? request.getPositionType() : StockOrderEntity.PositionType.LONG)
                .orderType(request.getOrderType() != null ? request.getOrderType() : StockOrderEntity.OrderType.MARKET)
                .leverage(request.getLeverage() != null ? request.getLeverage() : 1)
                .targetPrice(targetPrice)
                .quantity(request.getQuantity())
                .orderStatus(StockOrderEntity.OrderStatus.PENDING)
                .build();

        orderRepository.save(order);

        // 시장가 주문은 즉시 체결
        if (request.getOrderType() == StockOrderEntity.OrderType.MARKET) {
            executeOrder(order, stock.getCurrentPrice(), LocalDateTime.now());
        }
    }

    /** 미체결 주문 취소 */
    @Transactional
    public void cancelOrder(UserEntity user, Long orderId) {
        StockOrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 주문입니다."));

        if (!order.getUser().getId().equals(user.getId())) {
            throw new IllegalStateException("본인의 주문만 취소할 수 있습니다.");
        }

        if (order.getOrderStatus() != StockOrderEntity.OrderStatus.PENDING) {
            throw new IllegalStateException("이미 체결되었거나 취소된 주문입니다.");
        }

        // 증거금 환불
        if (order.getTradeType() == StockTradeEntity.TradeType.BUY) {
            StockWalletEntity wallet = getOrCreateWallet(user);
            wallet.deposit(order.getTargetPrice() * order.getQuantity());
        }

        order.cancel();
        orderRepository.save(order);
    }

    /** 내 미체결 주문 목록 */
    @Transactional(readOnly = true)
    public List<StockDTO.PendingOrderResponse> getPendingOrders(UserEntity user) {
        List<StockOrderEntity> pending = orderRepository.findByUserAndOrderStatusOrderByCreatedAtDesc(user, StockOrderEntity.OrderStatus.PENDING);
        Map<String, String> nameMap = stockRepository.findAll().stream().collect(Collectors.toMap(StockEntity::getTicker, StockEntity::getName));

        return pending.stream().map(o -> StockDTO.PendingOrderResponse.builder()
                .orderId(o.getId())
                .ticker(o.getTicker())
                .stockName(nameMap.getOrDefault(o.getTicker(), o.getTicker()))
                .tradeType(o.getTradeType().name())
                .positionType(o.getPositionType().name())
                .orderType(o.getOrderType().name())
                .leverage(o.getLeverage())
                .targetPrice(o.getTargetPrice())
                .quantity(o.getQuantity())
                .createdAt(o.getCreatedAt())
                .build()).collect(Collectors.toList());
    }

    private void generateNewsEvent(List<StockEntity> stocks, Random random) {
        StockEntity stock = stocks.get(random.nextInt(stocks.size()));
        boolean isGood = random.nextBoolean();

        String[] goodTitles = {
                stock.getName() + ", 차세대 AI 핵심 기술 대규모 수출 계약 체결!",
                "속보: " + stock.getName() + ", 분기 실적 역대 최대 어닝 서프라이즈 기록",
                "찌라시: " + stock.getName() + ", 글로벌 빅테크 기업 M&A 인수설 부각",
                stock.getName() + ", 기관 및 외국인 동시 폭풍 순매수세 유입",
                "속보: " + stock.getName() + ", 신규 특허 승인 소식에 투자 심리 급냉각 탈피"
        };

        String[] badTitles = {
                "속보: " + stock.getName() + ", 주요 공급망 차질 악재 발생으로 비상",
                "찌라시: " + stock.getName() + ", 대규모 차익 실현 매물 쏟아지며 급락세",
                stock.getName() + ", 글로벌 규제 당국 조사 소식에 투자 심리 위축",
                "속보: " + stock.getName() + ", 예상 밑도는 부진한 실적 발표 영향",
                "찌라시: " + stock.getName() + ", 대주주 지분 매도 루머에 불안감 증대"
        };

        String title = isGood ? goodTitles[random.nextInt(goodTitles.length)] : badTitles[random.nextInt(badTitles.length)];
        double impact = (random.nextDouble() * 0.08 + 0.04) * (isGood ? 1 : -1);

        long impactDelta = Math.round(stock.getCurrentPrice() * impact);
        long newPrice = Math.max(10L, stock.getCurrentPrice() + impactDelta);
        stock.updatePrice(newPrice);

        StockDTO.StockNewsResponse news = StockDTO.StockNewsResponse.builder()
                .id(UUID.randomUUID().toString())
                .ticker(stock.getTicker())
                .stockName(stock.getName())
                .title(title)
                .newsType(isGood ? "GOOD" : "BAD")
                .priceImpactPercent(Math.round(impact * 100.0 * 100.0) / 100.0)
                .createdAt(LocalDateTime.now())
                .build();

        addNews(news);
    }

    private void addNews(StockDTO.StockNewsResponse news) {
        recentNewsList.add(0, news);
        if (recentNewsList.size() > 20) {
            recentNewsList.remove(recentNewsList.size() - 1);
        }
        try {
            messagingTemplate.convertAndSend("/topic/stock-news", news);
        } catch (Exception e) {
            log.trace("웹소켓 뉴스 전송 생략: {}", e.getMessage());
        }
    }

    public List<StockDTO.StockNewsResponse> getRecentNews() {
        return new ArrayList<>(recentNewsList);
    }

    @Transactional(readOnly = true)
    public List<StockDTO.PriceHistoryResponse> getPriceHistory(String ticker) {
        return historyRepository.findByTickerOrderByRecordedAtAsc(ticker).stream()
                .map(h -> StockDTO.PriceHistoryResponse.builder()
                        .id(h.getId())
                        .ticker(h.getTicker())
                        .price(h.getPrice())
                        .recordedAt(h.getRecordedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public StockWalletEntity getOrCreateWallet(UserEntity user) {
        return walletRepository.findByUser(user)
                .orElseGet(() -> walletRepository.save(StockWalletEntity.builder()
                        .user(user)
                        .cash(INITIAL_CASH)
                        .build()));
    }

    @Transactional
    public StockDTO.WalletResponse getWalletResponse(UserEntity user) {
        StockWalletEntity wallet = getOrCreateWallet(user);
        List<StockHoldingEntity> holdings = holdingRepository.findByUser(user);

        long totalStockEvaluation = 0L;
        for (StockHoldingEntity holding : holdings) {
            StockEntity stock = stockRepository.findById(holding.getTicker()).orElse(null);
            if (stock != null) {
                long priceDiff = stock.getCurrentPrice() - holding.getAvgPrice();
                if (holding.getPositionType() == StockOrderEntity.PositionType.SHORT) {
                    priceDiff = holding.getAvgPrice() - stock.getCurrentPrice();
                }
                long pnlPerShare = priceDiff * holding.getLeverage();
                long eval = (holding.getAvgPrice() + pnlPerShare) * holding.getQuantity();
                totalStockEvaluation += Math.max(0L, eval);
            }
        }

        long totalAsset = wallet.getCash() + totalStockEvaluation;
        long totalInvested = INITIAL_CASH;
        long profit = totalAsset - totalInvested;
        double returnRate = ((double) profit / totalInvested) * 100;

        return StockDTO.WalletResponse.builder()
                .cash(wallet.getCash())
                .totalAsset(totalAsset)
                .totalInvested(totalInvested)
                .totalReturnRate(Math.round(returnRate * 100.0) / 100.0)
                .build();
    }

    @Transactional(readOnly = true)
    public List<StockDTO.HoldingResponse> getHoldings(UserEntity user) {
        List<StockHoldingEntity> holdings = holdingRepository.findByUser(user);
        List<StockDTO.HoldingResponse> result = new ArrayList<>();

        for (StockHoldingEntity h : holdings) {
            if (h.getQuantity() <= 0) continue;

            StockEntity stock = stockRepository.findById(h.getTicker()).orElse(null);
            if (stock == null) continue;

            long currentPrice = stock.getCurrentPrice();
            long priceDiff = currentPrice - h.getAvgPrice();
            if (h.getPositionType() == StockOrderEntity.PositionType.SHORT) {
                priceDiff = h.getAvgPrice() - currentPrice;
            }

            long pnlPerShare = priceDiff * h.getLeverage();
            long totalCost = h.getAvgPrice() * h.getQuantity();
            long totalEval = Math.max(0L, (h.getAvgPrice() + pnlPerShare) * h.getQuantity());
            long profit = totalEval - totalCost;
            double returnRate = totalCost > 0 ? ((double) profit / totalCost) * 100 : 0.0;

            result.add(StockDTO.HoldingResponse.builder()
                    .holdingId(h.getId())
                    .ticker(h.getTicker())
                    .stockName(stock.getName())
                    .positionType(h.getPositionType().name())
                    .leverage(h.getLeverage())
                    .quantity(h.getQuantity())
                    .avgPrice(h.getAvgPrice())
                    .currentPrice(currentPrice)
                    .totalEvaluation(totalEval)
                    .totalProfit(profit)
                    .returnRate(Math.round(returnRate * 100.0) / 100.0)
                    .build());
        }

        return result;
    }

    /** 호환용 구 매수 API */
    @Transactional
    public void buyStock(UserEntity user, String ticker, long quantity) {
        createOrder(user, new StockDTO.OrderRequest(ticker, StockTradeEntity.TradeType.BUY, StockOrderEntity.PositionType.LONG, StockOrderEntity.OrderType.MARKET, 1, 0L, quantity));
    }

    /** 호환용 구 매도 API */
    @Transactional
    public void sellStock(UserEntity user, String ticker, long quantity) {
        createOrder(user, new StockDTO.OrderRequest(ticker, StockTradeEntity.TradeType.SELL, StockOrderEntity.PositionType.LONG, StockOrderEntity.OrderType.MARKET, 1, 0L, quantity));
    }

    @Transactional(readOnly = true)
    public List<StockDTO.TradeHistoryResponse> getTradeHistory(UserEntity user) {
        List<StockTradeEntity> trades = tradeRepository.findTop20ByUserOrderByTradedAtDesc(user);
        Map<String, String> stockNameMap = stockRepository.findAll().stream()
                .collect(Collectors.toMap(StockEntity::getTicker, StockEntity::getName));

        return trades.stream().map(t -> StockDTO.TradeHistoryResponse.builder()
                .id(t.getId())
                .ticker(t.getTicker())
                .stockName(stockNameMap.getOrDefault(t.getTicker(), t.getTicker()))
                .tradeType(t.getTradeType().name())
                .quantity(t.getQuantity())
                .price(t.getPrice())
                .totalAmount(t.getPrice() * t.getQuantity())
                .tradedAt(t.getTradedAt())
                .build()).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StockDTO.LeaderboardResponse> getLeaderboard() {
        List<UserEntity> allUsers = userRepository.findAll();
        Map<String, StockEntity> stockMap = stockRepository.findAll().stream()
                .collect(Collectors.toMap(StockEntity::getTicker, s -> s));

        List<StockDTO.LeaderboardResponse> list = new ArrayList<>();

        for (UserEntity u : allUsers) {
            Optional<StockWalletEntity> walletOpt = walletRepository.findByUser(u);
            if (walletOpt.isEmpty()) continue;

            long cash = walletOpt.get().getCash();
            List<StockHoldingEntity> holdings = holdingRepository.findByUser(u);

            long evaluation = 0L;
            for (StockHoldingEntity h : holdings) {
                StockEntity stock = stockMap.get(h.getTicker());
                if (stock != null) {
                    long priceDiff = stock.getCurrentPrice() - h.getAvgPrice();
                    if (h.getPositionType() == StockOrderEntity.PositionType.SHORT) {
                        priceDiff = h.getAvgPrice() - stock.getCurrentPrice();
                    }
                    long pnlPerShare = priceDiff * h.getLeverage();
                    long eval = Math.max(0L, (h.getAvgPrice() + pnlPerShare) * h.getQuantity());
                    evaluation += eval;
                }
            }

            long totalAsset = cash + evaluation;
            double returnRate = ((double) (totalAsset - INITIAL_CASH) / INITIAL_CASH) * 100;

            list.add(StockDTO.LeaderboardResponse.builder()
                    .userId(u.getId())
                    .nickname(u.getNickname() != null ? u.getNickname() : u.getUsername())
                    .totalAsset(totalAsset)
                    .cash(cash)
                    .evaluation(evaluation)
                    .returnRate(Math.round(returnRate * 100.0) / 100.0)
                    .build());
        }

        list.sort((a, b) -> Long.compare(b.getTotalAsset(), a.getTotalAsset()));
        return list.stream().limit(20).collect(Collectors.toList());
    }
}
