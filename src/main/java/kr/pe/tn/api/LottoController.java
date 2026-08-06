package kr.pe.tn.api;

import kr.pe.tn.domain.lotto.entity.LottoEntity;
import kr.pe.tn.domain.lotto.service.LottoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 로또 API 컨트롤러 — 현재는 DB에 저장된 최신 회차 조회만 제공합니다.
 * (역대 목록·검색 API는 데이터 수집 불가로 제거됨)
 */
@RestController
@RequestMapping("/api/lotto")
@RequiredArgsConstructor
public class LottoController {

    private final LottoService lottoService;

    /**
     * 가장 최근 당첨 정보 조회 API
     */
    @GetMapping("/latest")
    public ResponseEntity<LottoEntity> getLatest() {
        return lottoService.getLatestLotto()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
