package kr.pe.tn.domain.jwt.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "jwt_refresh_entity")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", nullable = false)
    private String username;

    @Column(name = "refresh", nullable = false, length = 512)
    private String refresh;

    @CreatedDate
    @Column(name = "created_date", updatable = false)
    private LocalDateTime createdDate;

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getRefresh() { return refresh; }
    public LocalDateTime getCreatedDate() { return createdDate; }

    public static RefreshEntityBuilder builder() { return new RefreshEntityBuilder(); }

    public static class RefreshEntityBuilder {
        private String username;
        private String refresh;

        public RefreshEntityBuilder username(String username) { this.username = username; return this; }
        public RefreshEntityBuilder refresh(String refresh) { this.refresh = refresh; return this; }

        public RefreshEntity build() {
            RefreshEntity r = new RefreshEntity();
            r.username = this.username;
            r.refresh = this.refresh;
            return r;
        }
    }
}
