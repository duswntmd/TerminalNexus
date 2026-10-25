package kr.pe.tn.domain.lotto.dto;

import kr.pe.tn.domain.lotto.entity.LottoEntity;

import java.util.List;

public class LottoDTO {

    /** 회차 상세 (당첨금 포함) */
    public record DrawDetail(
            long drwNo,
            String date,
            List<Integer> numbers,
            int bonus,
            Long firstPrize,
            Integer firstWinners,
            Long firstTotal,
            Long secondPrize,
            Integer secondWinners,
            Long totalSales,
            String nextDrawDate) {

        public static DrawDetail of(LottoEntity e, String nextDrawDate) {
            return new DrawDetail(e.getDrwNo(), e.getDrwNoDate(), e.numbers(), e.getBnusNo(),
                    e.getFirstWinamnt(), e.getFirstPrzwnerCo(), e.getFirstAccumamnt(),
                    e.getSecondWinamnt(), e.getSecondPrzwnerCo(), e.getTotSellamnt(), nextDrawDate);
        }
    }

    /** 전체 목록용 간단 형식 (통계·번호 확인은 프론트에서 계산) */
    public record DrawSummary(long no, String date, List<Integer> numbers, int bonus) {
        public static DrawSummary of(LottoEntity e) {
            return new DrawSummary(e.getDrwNo(), e.getDrwNoDate(), e.numbers(), e.getBnusNo());
        }
    }
}
