package kr.pe.tn.config;

import jakarta.servlet.http.HttpServletResponse;
import kr.pe.tn.domain.jwt.service.JwtService;
import kr.pe.tn.domain.user.oauth2.CustomClientRegistrationRepo;
import kr.pe.tn.domain.user.service.UserService;
import kr.pe.tn.domain.user.entity.UserRoleType;
import kr.pe.tn.filter.JWTFilter;
import kr.pe.tn.filter.LoginFilter;
import kr.pe.tn.handler.RefreshTokenLogoutHandler;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.logout.LogoutFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

        private final AuthenticationConfiguration authenticationConfiguration;
        private final AuthenticationSuccessHandler loginSuccessHandler;
        private final AuthenticationSuccessHandler socialSuccessHandler;
        private final JwtService jwtService;
        private final CustomClientRegistrationRepo customClientRegistrationRepo;
        private final UserService userService;

        public SecurityConfig(
                        AuthenticationConfiguration authenticationConfiguration,
                        @Qualifier("LoginSuccessHandler") AuthenticationSuccessHandler loginSuccessHandler,
                        @Qualifier("SocialSuccessHandler") AuthenticationSuccessHandler socialSuccessHandler,
                        JwtService jwtService,
                        CustomClientRegistrationRepo customClientRegistrationRepo,
                        UserService userService) {
                this.authenticationConfiguration = authenticationConfiguration;
                this.loginSuccessHandler = loginSuccessHandler;
                this.socialSuccessHandler = socialSuccessHandler;
                this.jwtService = jwtService;
                this.customClientRegistrationRepo = customClientRegistrationRepo;
                this.userService = userService;
        }

        // 커스텀 자체 로그인 필터를 위한 AuthenticationManager Bean 수동 등록
        @Bean
        public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
                return configuration.getAuthenticationManager();
        }

        // 권한 계층
        @Bean
        public RoleHierarchy roleHierarchy() {
                return RoleHierarchyImpl.withRolePrefix("ROLE_")
                                .role(UserRoleType.ADMIN.name()).implies(UserRoleType.USER.name())
                                .build();
        }

        // CORS Bean
        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();
                // 로컬 개발 환경과 배포 환경 모두 허용
                configuration.setAllowedOrigins(
                                List.of("http://localhost:5173", "https://tnhub.kr", "https://www.tnhub.kr"));
                configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                configuration.setAllowedHeaders(List.of("*"));
                configuration.setAllowCredentials(true);
                configuration.setExposedHeaders(List.of("Authorization", "Set-Cookie"));
                configuration.setMaxAge(3600L);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }

        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

                // CSRF 보안 필터 disable
                http
                                .csrf(AbstractHttpConfigurer::disable);

                // CORS 설정
                http
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()));

                // 기본 로그아웃 필터 + 커스텀 Refresh 토큰 삭제 핸들러 추가
                http
                                .logout(logout -> logout
                                                .addLogoutHandler(new RefreshTokenLogoutHandler(jwtService)));

                // 커스텀 필터 추가
                http
                                .addFilterBefore(new JWTFilter(), LogoutFilter.class);

                http
                                .addFilterBefore(
                                                new LoginFilter(authenticationManager(authenticationConfiguration),
                                                                loginSuccessHandler),
                                                UsernamePasswordAuthenticationFilter.class);

                // 세션 필터 설정 (IF_REQUIRED: 필요할 때만 세션 생성)
                // JWT 인증은 유지하면서 조회수 카운팅 등에 세션 사용
                http
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED));

                // oauth2 로그인 방식
                http
                                .oauth2Login((oauth2) -> oauth2
                                                .loginPage("/user/loginForm")
                                                .clientRegistrationRepository(customClientRegistrationRepo
                                                                .clientRegistrationRepository())
                                                .userInfoEndpoint((userInfoEndpointConfig) -> userInfoEndpointConfig
                                                                .userService(userService))
                                                .successHandler(socialSuccessHandler));

                // 경로별 인증 및 인가 설정
                http
                                .authorizeHttpRequests((auth) -> auth
                                                .requestMatchers("/", "/css/**", "/js/**", "/images/**", "/fonts/**",
                                                                "/user/**", "/join/**", "/login/**", "/guide/**",
                                                                "/freeboard/**", "/cookie/**",
                                                                "/api/message", "/oauth2/**", "/logout",
                                                                "/jwt/**", "/api/user/exist/**", "/display",
                                                                "/download",
                                                                "/upload/**",
                                                                "/api/freeboard/**", // 게시판 API 추가
                                                                "/ws-chat/**") // WebSocket 엔드포인트
                                                .permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/user").permitAll()
                                                .requestMatchers("/api/fruits/**").authenticated() // 과일 AI API (로그인 필수)
                                                .requestMatchers("/api/chat/**").authenticated() // 채팅 API (로그인 필수)
                                                .requestMatchers("/admin/**").hasRole("ADMIN") // 관리자 경로 설정
                                                .anyRequest().authenticated());

                return http.build();
        }
}
