package kr.pe.tn.domain.lotto.dto;

import kr.pe.tn.domain.lotto.entity.LottoAlertEntity;
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

    public record TicketRequest(List<Integer> numbers, String label) {
    }

    /** latestRank: 최신 회차 기준 등수 (1~5, 낙첨 0) */
    public record TicketResponse(long id, List<Integer> numbers, String label, Integer latestRank) {
    }

    public record AlertResponse(long drwNo, int bestRank, int winCount, int ticketCount, boolean read) {
        public static AlertResponse of(LottoAlertEntity a) {
            return new AlertResponse(a.getDrwNo(), a.getBestRank(), a.getWinCount(), a.getTicketCount(), a.getRead());
        }
    }

    public record MyLotto(List<TicketResponse> tickets, List<AlertResponse> alerts, boolean emailOn,
                          boolean emailAvailable, boolean hasEmail, int maxTickets) {
    }

    public record EmailRequest(boolean on) {
    }
}
