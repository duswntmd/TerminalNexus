package kr.pe.tn.domain.janggi.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * 실시간 장기 대국 방 메모리 객체
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JanggiRoom {

    private String roomId;
    private String title;
    
    private String hostNickname;
    private String guestNickname;

    private String choNickname;
    private String hanNickname;

    @Builder.Default
    private String choFormation = "N_E_N_E";

    @Builder.Default
    private String hanFormation = "N_E_N_E";

    @Builder.Default
    private String currentTurn = "CHO";

    @Builder.Default
    private String status = "WAITING"; // WAITING, PLAYING, CHO_WIN, HAN_WIN

    @Builder.Default
    private int userCount = 1;

    public static JanggiRoom create(String title, String hostNickname, String preferredTeam, String formation) {
        String id = UUID.randomUUID().toString().substring(0, 8);
        boolean isCho = !"HAN".equalsIgnoreCase(preferredTeam);

        return JanggiRoom.builder()
                .roomId(id)
                .title(title)
                .hostNickname(hostNickname)
                .choNickname(isCho ? hostNickname : null)
                .hanNickname(isCho ? null : hostNickname)
                .choFormation(isCho ? formation : "N_E_N_E")
                .hanFormation(isCho ? "N_E_N_E" : formation)
                .currentTurn("CHO")
                .status("WAITING")
                .userCount(1)
                .build();
    }

    public boolean joinGuest(String guestNickname) {
        if (this.userCount >= 2) return false;
        this.guestNickname = guestNickname;
        this.userCount = 2;

        if (this.choNickname == null) {
            this.choNickname = guestNickname;
        } else if (this.hanNickname == null) {
            this.hanNickname = guestNickname;
        }
        return true;
    }
}
