package kr.pe.tn.domain.user.dto;

import kr.pe.tn.domain.user.entity.UserRoleType;

public record UserResponseDTO(String username, Boolean social, String nickname, String email, UserRoleType roleType) {
}
