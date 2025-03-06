package kr.pe.tn.domain.user.entity;

import lombok.Getter;

@Getter
public enum UserRoleType {

    ROLE_ADMIN("어드민"),
    ROLE_USER("유저");

    private final String description;

    UserRoleType(String description) {
        this.description = description;
    }
}
