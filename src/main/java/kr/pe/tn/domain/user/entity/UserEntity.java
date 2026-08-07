package kr.pe.tn.domain.user.entity;

import jakarta.persistence.*;
import kr.pe.tn.domain.user.dto.UserRequestDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "user_entity")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", unique = true, nullable = false, updatable = false)
    private String username;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "is_lock", nullable = false)
    private Boolean isLock;

    @Column(name = "is_social", nullable = false)
    private Boolean isSocial;

    @Enumerated(EnumType.STRING)
    @Column(name = "social_provider_type")
    private SocialProviderType socialProviderType;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_type", nullable = false)
    private UserRoleType roleType;

    @Column(name = "nickname")
    private String nickname;

    @Column(name = "email")
    private String email;

    @CreatedDate
    @Column(name = "created_date", updatable = false)
    private LocalDateTime createdDate;

    @LastModifiedDate
    @Column(name = "updated_date")
    private LocalDateTime updatedDate;

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getPassword() { return password; }
    public Boolean getIsLock() { return isLock; }
    public Boolean getIsSocial() { return isSocial; }
    public SocialProviderType getSocialProviderType() { return socialProviderType; }
    public UserRoleType getRoleType() { return roleType; }
    public String getNickname() { return nickname; }
    public String getEmail() { return email; }
    public LocalDateTime getCreatedDate() { return createdDate; }
    public LocalDateTime getUpdatedDate() { return updatedDate; }

    // 회원이 작성한 게시글 (cascade delete)
    @Builder.Default
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<kr.pe.tn.domain.freeboard.entity.FreeBoard> freeBoards = new java.util.ArrayList<>();

    // 회원이 작성한 댓글 (cascade delete)
    @Builder.Default
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<kr.pe.tn.domain.freeboard.entity.FreeBoardComment> freeBoardComments = new java.util.ArrayList<>();

    // 게시글 좋아요 (cascade delete)
    @Builder.Default
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<kr.pe.tn.domain.freeboard.entity.FreeBoardLike> freeBoardLikes = new java.util.ArrayList<>();

    // 게시글 싫어요 (cascade delete)
    @Builder.Default
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<kr.pe.tn.domain.freeboard.entity.FreeBoardDislike> freeBoardDislikes = new java.util.ArrayList<>();

    public void updateUser(UserRequestDTO dto) {
        this.email = dto.getEmail();
        this.nickname = dto.getNickname();
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            this.password = dto.getPassword();
        }
    }

    /**
     * 관리자 전용: 계정 잠금 상태 변경
     */
    public void updateLockStatus(Boolean isLock) {
        this.isLock = isLock;
    }

    /**
     * 관리자 전용: 권한 변경
     */
    public void updateRoleType(UserRoleType roleType) {
        this.roleType = roleType;
    }

    public static UserEntityBuilder builder() { return new UserEntityBuilder(); }

    public static class UserEntityBuilder {
        private String username;
        private String password;
        private Boolean isLock = false;
        private Boolean isSocial = false;
        private SocialProviderType socialProviderType;
        private UserRoleType roleType = UserRoleType.USER;
        private String nickname;
        private String email;

        public UserEntityBuilder username(String username) { this.username = username; return this; }
        public UserEntityBuilder password(String password) { this.password = password; return this; }
        public UserEntityBuilder isLock(Boolean isLock) { this.isLock = isLock; return this; }
        public UserEntityBuilder isSocial(Boolean isSocial) { this.isSocial = isSocial; return this; }
        public UserEntityBuilder socialProviderType(SocialProviderType socialProviderType) { this.socialProviderType = socialProviderType; return this; }
        public UserEntityBuilder roleType(UserRoleType roleType) { this.roleType = roleType; return this; }
        public UserEntityBuilder nickname(String nickname) { this.nickname = nickname; return this; }
        public UserEntityBuilder email(String email) { this.email = email; return this; }

        public UserEntity build() {
            UserEntity u = new UserEntity();
            u.username = this.username;
            u.password = this.password;
            u.isLock = this.isLock != null ? this.isLock : false;
            u.isSocial = this.isSocial != null ? this.isSocial : false;
            u.socialProviderType = this.socialProviderType;
            u.roleType = this.roleType != null ? this.roleType : UserRoleType.USER;
            u.nickname = this.nickname;
            u.email = this.email;
            return u;
        }
    }
}
