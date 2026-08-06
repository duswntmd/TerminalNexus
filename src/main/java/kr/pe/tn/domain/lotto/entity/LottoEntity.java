package kr.pe.tn.domain.lotto.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

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

    @Column(name = "first_accumamnt")
    private Long firstAccumamnt;

    @Column(name = "first_przwner_co")
    private Integer firstPrzwnerCo;
}
