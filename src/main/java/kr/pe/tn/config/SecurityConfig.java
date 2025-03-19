package kr.pe.tn.config;

import kr.pe.tn.domain.user.entity.UserRoleType;
import kr.pe.tn.domain.user.oauth2.CustomClientRegistrationRepo;
import kr.pe.tn.domain.user.service.CustomOAuth2UserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomOAuth2UserService customOAuth2UserService;
    private final CustomClientRegistrationRepo customClientRegistrationRepo;

    public SecurityConfig(CustomOAuth2UserService customOAuth2UserService, CustomClientRegistrationRepo customClientRegistrationRepo) {

        this.customOAuth2UserService = customOAuth2UserService;
        this.customClientRegistrationRepo = customClientRegistrationRepo;
    }

    // AuthenticationManager Bean 등록
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {

        return configuration.getAuthenticationManager();
    }

    @Bean
    public BCryptPasswordEncoder bCryptPasswordEncoder() {

        return new BCryptPasswordEncoder();
    }

    // 시큐리티 role 계층화
    @Bean
    public RoleHierarchy roleHierarchy() {

        return RoleHierarchyImpl.withRolePrefix("ROLE_")
                .role(UserRoleType.ROLE_ADMIN.toString()).implies(UserRoleType.ROLE_USER.toString())
                .build();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        // csrf disable
        http
                .csrf((auth) -> auth.disable());
        // From 로그인 방식 disable
        http
                .formLogin((auth) -> auth.disable());
        // http basic 인증 방식 disable
        http
                .httpBasic((auth) -> auth.disable());
        // oauth2 로그인 방식
        http
                .oauth2Login((oauth2) -> oauth2
                        .loginPage("/user/loginForm")
                        .clientRegistrationRepository(customClientRegistrationRepo.clientRegistrationRepository())
                        .userInfoEndpoint((userInfoEndpointConfig) ->
                                userInfoEndpointConfig.userService(customOAuth2UserService)));
        // 경로별 인증 및 인가 설정
        http
                .authorizeHttpRequests((auth) -> auth
//                        .dispatcherTypeMatchers(DispatcherType.FORWARD, DispatcherType.ERROR).permitAll()
                        .requestMatchers("/", "favicon.ico", "/user/loginForm", "/user/login", "/user/registerForm", "/user/register",
                                "/api/message", "/oauth2/**", "/login/**", "/logout")
                        .permitAll()
                        .requestMatchers("/admin").hasRole("ADMIN")
                        .requestMatchers("/user/profile").hasRole("USER")
                        .anyRequest().authenticated());

        return http.build();
    }
}

//package kr.pe.tn.config;
//
//import jakarta.servlet.DispatcherType;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.security.authentication.AuthenticationManager;
//import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
//import org.springframework.security.config.annotation.web.builders.HttpSecurity;
//import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
//import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
//import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
//import org.springframework.security.web.SecurityFilterChain;
//import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
//
//import javax.sql.DataSource;
//
//@Slf4j
//@Configuration
//@EnableWebSecurity
//public class SecurityConfig {
//
//    @Autowired
//    private DataSource dataSource;
//
//    // 생성자 주입
//    @Autowired
//    public SecurityConfig(DataSource dataSource) {
//        this.dataSource = dataSource;
//    }
//
//    @Bean
//    public BCryptPasswordEncoder passwordEncoder() {
//        return new BCryptPasswordEncoder();
//    }
//
//    @Bean
//    public AuthenticationManager authenticationManager(HttpSecurity http) throws Exception {
//        return http.getSharedObject(AuthenticationManagerBuilder.class)
//                .build();
//    }
//
//    @Bean
//    public WebSecurityCustomizer webSecurityCustomizer() {
//        return (web) -> web.ignoring().requestMatchers("/resources/**", "/ignore2");
//    }
//
//    @Autowired
//    public void configAuthentication(AuthenticationManagerBuilder auth) throws Exception {
//        log.info("데이터소스 설정");
//        auth.jdbcAuthentication().dataSource(dataSource);
//
//       /* users, authorities 이외의 다른 테이블 이름을 사용하는 경우에는 아래의 설정이 필수
//       auth.jdbcAuthentication().dataSource(dataSource)
//       .usersByUsernameQuery(
//                "SELECT username,password, enabled FROM users WHERE username=?")
//       .authoritiesByUsernameQuery(
//                "SELECT username, authority FROM authorities WHERE username=?");
//       */
//    }
//
//    @Bean
//    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
//        log.info("접근제한 설정");
//
//        http.authorizeHttpRequests(authz -> authz
//                        .dispatcherTypeMatchers(DispatcherType.FORWARD, DispatcherType.ERROR).permitAll()
//                        .requestMatchers("/", "/login/**", "/register/add", "/css/**", "/images/**", "/js/**", "/static/**")
//                        .permitAll()
//                        .requestMatchers("/register/updateuser", "/register/deleteuser").hasAnyRole("USER", "ADMIN")
//
//                        //.anyRequest().authenticated()  // 그 외의 모든 요청은 인증 필요
//                        .anyRequest().denyAll()
////        ).requiresChannel(channel ->
////                channel.anyRequest().requiresSecure() // HTTPS 강제
//        ).csrf( csrfConf -> csrfConf.disable()
//        ).formLogin(loginConf -> loginConf.loginPage("/login/login")   // 컨트롤러 메소드와 지정된 위치에 로그인 폼이 준비되어야 함
//                .loginProcessingUrl("/dologin")            // 컨트롤러 메소드 불필요, 폼 action과 일치해야 함
//                .failureUrl("/login/login")      // 로그인 실패시 이동 경로(컨트롤러 메소드 필요함)
//                //.failureForwardUrl("/login?error=Y")  //실패시 다른 곳으로 forward
//                //.defaultSuccessUrl("/", true)
////                .successHandler(successHandler)
//                .usernameParameter("id")  // 로그인 폼에서 이용자 ID 필드 이름, 디폴트는 username
//                .passwordParameter("pwd")  // 로그인 폼에서 이용자 암호 필트 이름, 디폴트는 password
//                .permitAll()
//
//        ).logout(logoutConf -> logoutConf.logoutRequestMatcher(new AntPathRequestMatcher("/login/logout")) //로그아웃 요청시 URL
//                .logoutSuccessUrl("/login/login")   // 로그아웃 성공시 다시 로그인폼으로 이동
//                .invalidateHttpSession(true)
//                .deleteCookies("JSESSIONID")
//                .permitAll()
//        ).sessionManagement(sessionManagement ->
//                sessionManagement.sessionFixation().none() // 기존 세션 유지 (또는 .sessionFixation().migrateSession()으로 설정 가능)
//        ).exceptionHandling(exConf -> exConf.accessDeniedPage("/noaccess")); // 권한이 없어 접속 거부할 때
//
//        return http.build();
//    }
//
//}
