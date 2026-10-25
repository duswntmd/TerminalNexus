package kr.pe.tn.api;

import kr.pe.tn.domain.lotto.dto.LottoDTO;
import kr.pe.tn.domain.lotto.service.LottoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * 로또 6/45 당첨번호 조회 API (로그인 불필요)
 */
@RestController
@RequestMapping("/api/lotto")
@RequiredArgsConstructor
public class LottoController {

    private final LottoService lottoService;

    /** 최신 회차 상세 */
    @GetMapping("/latest")
    public ResponseEntity<LottoDTO.DrawDetail> getLatest() {
        String next = lottoService.getNextDrawDate().map(LocalDate::toString).orElse(null);
        return lottoService.getLatestLotto()
                .map(e -> ResponseEntity.ok(LottoDTO.DrawDetail.of(e, next)))
                .orElse(ResponseEntity.noContent().build());
    }

    /** 특정 회차 상세 */
    @GetMapping("/draw/{drwNo}")
    public ResponseEntity<LottoDTO.DrawDetail> getDraw(@PathVariable long drwNo) {
        return lottoService.getLottoByDrwNo(drwNo)
                .map(e -> ResponseEntity.ok(LottoDTO.DrawDetail.of(e, null)))
                .orElse(ResponseEntity.notFound().build());
    }

    /** 전 회차 번호 목록 (최신순) */
    @GetMapping("/draws")
    public ResponseEntity<List<LottoDTO.DrawSummary>> getDraws() {
        List<LottoDTO.DrawSummary> list = lottoService.getAll().stream().map(LottoDTO.DrawSummary::of).toList();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic())
                .body(list);
    }
}
