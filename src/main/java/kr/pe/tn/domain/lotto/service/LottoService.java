package kr.pe.tn.domain.lotto.service;

import kr.pe.tn.domain.lotto.entity.LottoEntity;
import kr.pe.tn.domain.lotto.repository.LottoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * 로또 서비스 — 현재는 DB에 저장된 데이터 조회만 담당합니다.
 * (동행복권 API는 서버사이드 요청을 차단하여 데이터 수집 기능은 비활성화)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LottoService {

    private final LottoRepository lottoRepository;

    /**
     * 가장 최근 당첨 정보 조회
     */
    public Optional<LottoEntity> getLatestLotto() {
        return lottoRepository.findFirstByOrderByDrwNoDesc();
    }

    /**
     * 특정 회차 단건 조회
     */
    public Optional<LottoEntity> getLottoByDrwNo(long drwNo) {
        return lottoRepository.findById(drwNo);
    }
}
