package kr.pe.tn.domain.user.dto;

import kr.pe.tn.domain.user.entity.UserRoleType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 관리자용 회원 관리 DTO
 * 전체 회원 목록 조회 시 사용
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserDTO {

    private Long id;
    private String username;
    private String nickname;
    private String email;
    private Boolean isLock;
    private Boolean isSocial;
    private UserRoleType roleType;
    private LocalDateTime createdDate;
    private LocalDateTime updatedDate;

    /**
     * Entity -> DTO 변환 생성자
     */
    public AdminUserDTO(kr.pe.tn.domain.user.entity.UserEntity entity) {
        this.id = entity.getId();
        this.username = entity.getUsername();
        this.nickname = entity.getNickname();
        this.email = entity.getEmail();
        this.isLock = entity.getIsLock();
        this.isSocial = entity.getIsSocial();
        this.roleType = entity.getRoleType();
        this.createdDate = entity.getCreatedDate();
        this.updatedDate = entity.getUpdatedDate();
    }
}
