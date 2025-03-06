package kr.pe.tn.domain.user.dto;

import lombok.Data;

@Data
public class UserResponseDTO {

    private String username;
    private String nickname;
    private String email;
    private String role;
}
