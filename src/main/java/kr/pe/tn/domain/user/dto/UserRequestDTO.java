package kr.pe.tn.domain.user.dto;

import lombok.Data;

@Data
public class UserRequestDTO {

    private String username;
    private String password;
    private String nickname;
    private String email;
}
