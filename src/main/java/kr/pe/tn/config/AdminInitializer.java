package kr.pe.tn.config;

import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.entity.UserRoleType;
import kr.pe.tn.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 초기 관리자 계정 자동 생성 설정
 * 애플리케이션 시작 시 관리자 계정이 없으면 자동으로 생성합니다.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class AdminInitializer {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // 환경변수로 관리자 정보 설정 가능 (기본값 제공)
    @Value("${admin.init.username:admin}")
    private String adminUsername;

    @Value("${admin.init.password:admin1234!}")
    private String adminPassword;

    @Value("${admin.init.nickname:관리자}")
    private String adminNickname;

    @Value("${admin.init.email:admin@tnhub.kr}")
    private String adminEmail;

    /**
     * 애플리케이션 시작 시 관리자 계정 자동 생성
     */
    @Bean
    public CommandLineRunner initAdminUser() {
        return args -> {
            // 이미 관리자 계정이 존재하는지 확인
            if (!userRepository.existsByUsername(adminUsername)) {
                UserEntity adminUser = UserEntity.builder()
                        .username(adminUsername)
                        .password(passwordEncoder.encode(adminPassword))
                        .isLock(false)
                        .isSocial(false)
                        .roleType(UserRoleType.ADMIN) // 관리자 권한 부여
                        .nickname(adminNickname)
                        .email(adminEmail)
                        .build();

                userRepository.save(adminUser);
                log.info("✅ 초기 관리자 계정이 생성되었습니다.");
                log.info("   - Username: {}", adminUsername);
                log.info("   - Nickname: {}", adminNickname);
                log.info("   - Email: {}", adminEmail);
                log.warn("⚠️  보안을 위해 관리자 비밀번호를 반드시 변경하세요!");
            } else {
                log.info("ℹ️  관리자 계정이 이미 존재합니다. (username: {})", adminUsername);
            }
        };
    }
}
