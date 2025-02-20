//package kr.pe.tn.config;
//
//import jakarta.servlet.DispatcherType;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
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
////    @Autowired
////    public SecurityConfig(DataSource dataSource) {
////        this.dataSource = dataSource;
////    }
//
//
////    public static void main(String[] args) {
////        SpringApplication.run(SecurityConfig.class, args);
////    }
//
////    @Bean
////    public ServletWebServerFactory servletContainer() {
////        // Tomcat을 커스터마이징하여 HTTP 요청을 HTTPS로 리디렉션
////        TomcatServletWebServerFactory tomcat = new TomcatServletWebServerFactory() {
////            @Override
////            protected void postProcessContext(Context context) {
////                SecurityConstraint securityConstraint = new SecurityConstraint();
////                securityConstraint.setUserConstraint("CONFIDENTIAL"); // HTTPS 강제
////                SecurityCollection collection = new SecurityCollection();
////                collection.addPattern("/*"); // 모든 경로에 적용
////                securityConstraint.addCollection(collection);
////                context.addConstraint(securityConstraint);
////            }
////        };
////
////        // HTTP → HTTPS 리디렉션 설정 추가
////        tomcat.addAdditionalTomcatConnectors(httpToHttpsRedirectConnector());
////
////        return tomcat;
////    }
////
////    private Connector httpToHttpsRedirectConnector() {
////        Connector connector = new Connector(TomcatServletWebServerFactory.DEFAULT_PROTOCOL);
////        connector.setScheme("http");
////        connector.setPort(80); // HTTP 포트
////        connector.setSecure(false);
////        connector.setRedirectPort(443); // HTTPS 포트로 리디렉션
////        return connector;
////    }
//
//    @Bean
//    public BCryptPasswordEncoder passwordEncoder() {
//        return new BCryptPasswordEncoder();
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
//                        .requestMatchers("/", "/favicon.ico", "/login/**", "/register/add", "/board/list", "/comments/list",
//                                "/findME", "findResult", "/exerciseDetail/**",
//                                "/ShopImage/**", "/css/**", "/Assets/**", "/boardimages/**", "/files/**", "/image/**", "/js/**", "/static/**",
//                                "/mail/**","favicon.ico", "/video_storage/**",
//                                "/ai/chatBot/**", "/shop/**","/ai/predict_result","/ai/predict_exercise","/ai/aiResult",
//                                "/trainer/**","/challenge","/challenge/detail/*","/challenge/search","/proofShot/*","/challenge/detail/*"
//
//                        ).permitAll()
//
//                        .requestMatchers("/cart/**").hasAnyRole("USER","ADMIN")
//                        .requestMatchers("/qna/**").hasAnyRole("USER","ADMIN")
//                        .requestMatchers("/register/updateuser", "/register/deleteuser").hasAnyRole("USER","ADMIN")
//                        .requestMatchers("/board/write", "/board/search", "/board/view/**", "/board/view/**", "/board/view/**",
//                                "/board/view/**", "/board/edit/**", "/board/delete/**", "/board/download/**",
//                                "/board/download/**", "/board/like/**", "/board/unlike/**", "/comments/add/**",
//                                "/comments/add/**", "/comments/edit/**", "/comments/delete/**").hasAnyRole("USER","ADMIN")
//                        .requestMatchers("/kakao/map/**", "/kakao/reviewDetail/**", "/kakao/addReview/**", "/kakao/editReview/**",
//                                "/kakao/deleteReview").hasAnyRole("USER","ADMIN")
//                        .requestMatchers("/ai/userVideos", "/ai/uploadVideo", "/ai/analyzeVideo", "/ai/detailvideo/**").hasAnyRole("USER","ADMIN")
//                        .requestMatchers("/ws/**","/chat", "/tChat", "/alarm").hasAnyRole("USER","ADMIN")
//                        .requestMatchers("/consultation/**").hasAnyRole("USER","ADMIN")
//                        .requestMatchers("/challenge/add","/challenge/save","/challenge/participate/*","/challenge/participate",
//                                "challenge/myChall","/chellComment/**","/challenge/delete/*","/challenge/edit","/challenge/cancel/*").hasAnyRole("USER","ADMIN")
//                        .requestMatchers("/proofComment/**","/proofComment/editComment/*","proofShot/addProofShotForm/*","proofShot/add/","proofShot/addChatProof","proofShot/verify","proofShot/deletePost/*").hasAnyRole("USER","ADMIN")
//                        .requestMatchers("pay/*","cancel/**" ,"verify/**","/savePayment","/orderPayment","/getMyPayments","/myOrder","/getMyPaymentsData").hasAnyRole("USER","ADMIN")
//                        .requestMatchers("/admin/**").hasAnyRole("ADMIN")
//                        .requestMatchers("/user/myPage").hasAnyRole("USER","ADMIN")
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
//
//}
