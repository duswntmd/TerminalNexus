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

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public Boolean getIsLock() { return isLock; }
    public void setIsLock(Boolean isLock) { this.isLock = isLock; }
    public UserRoleType getRoleType() { return roleType; }
    public void setRoleType(UserRoleType roleType) { this.roleType = roleType; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
