package kr.pe.tn.domain.lotto.event;

import kr.pe.tn.domain.lotto.entity.LottoEntity;

/** 새 회차 당첨번호가 저장됐을 때 */
public record LottoDrawAddedEvent(LottoEntity draw) {
}
