package kr.pe.tn.domain.lotto.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 로또 알림 수신 설정 (행이 없으면 메일 받지 않음) */
@Entity
@Table(name = "lotto_pref")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LottoPrefEntity {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "email_on", nullable = false)
    private Boolean emailOn;

    public LottoPrefEntity(Long userId, boolean emailOn) {
        this.userId = userId;
        this.emailOn = emailOn;
    }

    public void setEmailOn(boolean emailOn) {
        this.emailOn = emailOn;
    }
}
