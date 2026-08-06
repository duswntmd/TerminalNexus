package kr.pe.tn.api;

import kr.pe.tn.domain.stock.dto.StockDTO;
import kr.pe.tn.domain.stock.service.StockService;
import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;
    private final UserRepository userRepository;

    private UserEntity getUser(Principal principal) {
        if (principal == null) {
            throw new IllegalStateException("로그인이 필요합니다.");
        }
        return userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
    }

    /** 전체 종목 시세 조회 (공개) */
    @GetMapping("/prices")
    public ResponseEntity<List<StockDTO.StockItemResponse>> getAllStocks() {
        return ResponseEntity.ok(stockService.getAllStocks());
    }

    /** 특정 종목 라인 차트 히스토리 (공개) */
    @GetMapping("/history/{ticker}")
    public ResponseEntity<List<StockDTO.PriceHistoryResponse>> getPriceHistory(@PathVariable String ticker) {
        return ResponseEntity.ok(stockService.getPriceHistory(ticker.toUpperCase()));
    }

    /** 특정 종목 캔들스틱 OHLC 봉차트 데이터 (공개) */
    @GetMapping("/candles/{ticker}")
    public ResponseEntity<List<StockDTO.CandleResponse>> getCandles(@PathVariable String ticker) {
        return ResponseEntity.ok(stockService.getCandles(ticker.toUpperCase()));
    }

    /** 특정 종목 10호가창 데이터 (공개) */
    @GetMapping("/orderbook/{ticker}")
    public ResponseEntity<StockDTO.OrderBookResponse> getOrderBook(@PathVariable String ticker) {
        return ResponseEntity.ok(stockService.getOrderBook(ticker.toUpperCase()));
    }

    /** 특정 종목 기업 정보 & 재무 지표 (공개) */
    @GetMapping("/detail/{ticker}")
    public ResponseEntity<StockDTO.CompanyDetailResponse> getCompanyDetail(@PathVariable String ticker) {
        return ResponseEntity.ok(stockService.getCompanyDetail(ticker.toUpperCase()));
    }

    /** 전체 랭킹 (공개) */
    @GetMapping("/leaderboard")
    public ResponseEntity<List<StockDTO.LeaderboardResponse>> getLeaderboard() {
        return ResponseEntity.ok(stockService.getLeaderboard());
    }

    /** 최근 주식 속보 뉴스 (공개) */
    @GetMapping("/news")
    public ResponseEntity<List<StockDTO.StockNewsResponse>> getRecentNews() {
        return ResponseEntity.ok(stockService.getRecentNews());
    }

    /** 내 지갑 정보 (로그인 필수) */
    @GetMapping("/wallet")
    public ResponseEntity<StockDTO.WalletResponse> getWallet(Principal principal) {
        UserEntity user = getUser(principal);
        return ResponseEntity.ok(stockService.getWalletResponse(user));
    }

    /** 내 보유 종목 (로그인 필수) */
    @GetMapping("/holdings")
    public ResponseEntity<List<StockDTO.HoldingResponse>> getHoldings(Principal principal) {
        UserEntity user = getUser(principal);
        return ResponseEntity.ok(stockService.getHoldings(user));
    }

    /** 내 거래 내역 (로그인 필수) */
    @GetMapping("/trades")
    public ResponseEntity<List<StockDTO.TradeHistoryResponse>> getTradeHistory(Principal principal) {
        UserEntity user = getUser(principal);
        return ResponseEntity.ok(stockService.getTradeHistory(user));
    }

    /** 내 미체결 예약 주문 목록 (로그인 필수) */
    @GetMapping("/orders/pending")
    public ResponseEntity<List<StockDTO.PendingOrderResponse>> getPendingOrders(Principal principal) {
        UserEntity user = getUser(principal);
        return ResponseEntity.ok(stockService.getPendingOrders(user));
    }

    /** 신규 주문 접수 (시장가/지정가, LONG/SHORT, 1x/2x 레버리지) */
    @PostMapping("/order")
    public ResponseEntity<?> createOrder(Principal principal, @RequestBody StockDTO.OrderRequest request) {
        UserEntity user = getUser(principal);
        stockService.createOrder(user, request);
        return ResponseEntity.ok(Map.of("message", "주문이 정상 접수되었습니다."));
    }

    /** 미체결 주문 취소 */
    @DeleteMapping("/order/{orderId}")
    public ResponseEntity<?> cancelOrder(Principal principal, @PathVariable Long orderId) {
        UserEntity user = getUser(principal);
        stockService.cancelOrder(user, orderId);
        return ResponseEntity.ok(Map.of("message", "주문이 취소되었습니다."));
    }

    /** 구 버전 호환 매수 API */
    @PostMapping("/buy")
    public ResponseEntity<?> buyStock(Principal principal, @RequestBody StockDTO.TradeRequest request) {
        UserEntity user = getUser(principal);
        stockService.buyStock(user, request.getTicker().toUpperCase(), request.getQuantity());
        return ResponseEntity.ok(Map.of("message", "매수가 완료되었습니다."));
    }

    /** 구 버전 호환 매도 API */
    @PostMapping("/sell")
    public ResponseEntity<?> sellStock(Principal principal, @RequestBody StockDTO.TradeRequest request) {
        UserEntity user = getUser(principal);
        stockService.sellStock(user, request.getTicker().toUpperCase(), request.getQuantity());
        return ResponseEntity.ok(Map.of("message", "매도가 완료되었습니다."));
    }
}
