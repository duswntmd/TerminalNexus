package kr.pe.tn.domain.lotto.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 로또 6/45 회차별 당첨 결과 (동행복권 공개 데이터)
 */
@Entity
@Table(name = "lotto_record")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LottoEntity {

    @Id
    @Column(name = "drw_no")
    private Long drwNo;

    /** 추첨일 (yyyy-MM-dd) */
    @Column(name = "drw_no_date", length = 30)
    private String drwNoDate;

    @Column(name = "drwt_no1", nullable = false)
    private Integer drwtNo1;

    @Column(name = "drwt_no2", nullable = false)
    private Integer drwtNo2;

    @Column(name = "drwt_no3", nullable = false)
    private Integer drwtNo3;

    @Column(name = "drwt_no4", nullable = false)
    private Integer drwtNo4;

    @Column(name = "drwt_no5", nullable = false)
    private Integer drwtNo5;

    @Column(name = "drwt_no6", nullable = false)
    private Integer drwtNo6;

    @Column(name = "bnus_no", nullable = false)
    private Integer bnusNo;

    /** 1등 총 당첨금 */
    @Column(name = "first_accumamnt")
    private Long firstAccumamnt;

    /** 1등 1인당 당첨금 */
    @Column(name = "first_winamnt")
    private Long firstWinamnt;

    @Column(name = "first_przwner_co")
    private Integer firstPrzwnerCo;

    /** 2등 1인당 당첨금 */
    @Column(name = "second_winamnt")
    private Long secondWinamnt;

    @Column(name = "second_przwner_co")
    private Integer secondPrzwnerCo;

    /** 총 판매액 */
    @Column(name = "tot_sellamnt")
    private Long totSellamnt;

    public List<Integer> numbers() {
        return List.of(drwtNo1, drwtNo2, drwtNo3, drwtNo4, drwtNo5, drwtNo6);
    }
}
