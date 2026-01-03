package kr.pe.tn.domain.user.dto;

import kr.pe.tn.domain.user.entity.UserRoleType;
import lombok.Getter;
import lombok.Setter;

/**
 * 관리자가 회원 정보를 수정할 때 사용하는 DTO
 */
@Getter
@Setter
public class AdminUserUpdateDTO {

    private Long id;
    private String nickname;
    private String email;
    private Boolean isLock;
    private UserRoleType roleType;
    private String password; // 비밀번호 재설정 (선택사항)
}
