package kr.pe.tn.api;

import kr.pe.tn.domain.stock.dto.StockDTO;
import kr.pe.tn.domain.stock.service.StockRules;
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

    /** 전체 종목 시세 (공개) */
    @GetMapping("/prices")
    public List<StockDTO.StockItemResponse> getAllStocks() {
        return stockService.getAllStocks();
    }

    /** 장 정보: 장 마감 시각, 수수료·세율 (공개) */
    @GetMapping("/market")
    public Map<String, Object> getMarket() {
        return Map.of(
                "sessionEndsAt", stockService.getSessionEndsAt(),
                "serverTime", System.currentTimeMillis(),
                "feeRate", StockRules.FEE_RATE,
                "taxRate", StockRules.TAX_RATE,
                "initialCash", StockService.INITIAL_CASH);
    }

    /** 봉 데이터: interval = M1(분봉) / D1(일봉, 1시간 = 1거래일) (공개) */
    @GetMapping("/candles/{ticker}")
    public List<StockDTO.CandleResponse> getCandles(@PathVariable String ticker,
                                                   @RequestParam(defaultValue = "M1") String interval) {
        return stockService.getCandles(ticker.toUpperCase(), interval);
    }

    /** 실시간 체결 (공개) */
    @GetMapping("/ticks/{ticker}")
    public List<StockDTO.TickResponse> getTicks(@PathVariable String ticker) {
        return stockService.getRecentTicks(ticker.toUpperCase());
    }

    /** 10단 호가 (공개, 로그인 시 내 주문 표시) */
    @GetMapping("/orderbook/{ticker}")
    public StockDTO.OrderBookResponse getOrderBook(@PathVariable String ticker, Principal principal) {
        UserEntity viewer = principal != null ? userRepository.findByUsername(principal.getName()).orElse(null) : null;
        return stockService.getOrderBook(ticker.toUpperCase(), viewer);
    }

    /** 기업 정보 (공개) */
    @GetMapping("/detail/{ticker}")
    public StockDTO.CompanyDetailResponse getCompanyDetail(@PathVariable String ticker) {
        return stockService.getCompanyDetail(ticker.toUpperCase());
    }

    /** 총자산 랭킹 (공개) */
    @GetMapping("/leaderboard")
    public List<StockDTO.LeaderboardResponse> getLeaderboard() {
        return stockService.getLeaderboard();
    }

    /** 최근 뉴스 (공개) */
    @GetMapping("/news")
    public List<StockDTO.StockNewsResponse> getRecentNews() {
        return stockService.getRecentNews();
    }

    @GetMapping("/wallet")
    public StockDTO.WalletResponse getWallet(Principal principal) {
        return stockService.getWallet(getUser(principal));
    }

    @GetMapping("/holdings")
    public List<StockDTO.HoldingResponse> getHoldings(Principal principal) {
        return stockService.getHoldings(getUser(principal));
    }

    @GetMapping("/trades")
    public List<StockDTO.TradeHistoryResponse> getTradeHistory(Principal principal) {
        return stockService.getTradeHistory(getUser(principal));
    }

    @GetMapping("/orders/pending")
    public List<StockDTO.PendingOrderResponse> getPendingOrders(Principal principal) {
        return stockService.getPendingOrders(getUser(principal));
    }

    /** 주문 (시장가 / 지정가) */
    @PostMapping("/order")
    public StockDTO.OrderResult createOrder(Principal principal, @RequestBody StockDTO.OrderRequest request) {
        return stockService.createOrder(getUser(principal), request);
    }

    /** 미체결 주문 취소 */
    @DeleteMapping("/order/{orderId}")
    public ResponseEntity<?> cancelOrder(Principal principal, @PathVariable Long orderId) {
        stockService.cancelOrder(getUser(principal), orderId);
        return ResponseEntity.ok(Map.of("message", "주문이 취소되었습니다."));
    }
}
