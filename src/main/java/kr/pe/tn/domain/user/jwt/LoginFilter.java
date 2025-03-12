package kr.pe.tn.domain.user.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kr.pe.tn.domain.user.dto.UserRequestDTO;
import kr.pe.tn.domain.user.entity.RefreshEntity;
import kr.pe.tn.domain.user.repository.RefreshRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.Collection;
import java.util.Iterator;
import java.util.Date;

public class LoginFilter extends UsernamePasswordAuthenticationFilter {

    private final AuthenticationManager authenticationManager;
    private final JWTUtil jwtUtil;
    private final RefreshRepository refreshRepository;

    public LoginFilter(AuthenticationManager authenticationManager, JWTUtil jwtUtil, RefreshRepository refreshRepository) {

        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.refreshRepository = refreshRepository;

        setFilterProcessesUrl("/user/login");
    }

    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response) throws AuthenticationException {

        System.out.println("✅ LoginFilter 실행됨! 요청 URL: " + request.getRequestURI());
        try {
            // JSON 바디 직접 읽기
            ObjectMapper objectMapper = new ObjectMapper();
            UserRequestDTO loginRequest = objectMapper.readValue(request.getInputStream(), UserRequestDTO.class);

            // 클라이언트 요청에서 username, password 추출
            String username = loginRequest.getUsername();
            String password = loginRequest.getPassword();

            System.out.println("✅ 로그인 시도 - username: " + username + ", password: " + password);

            //스프링 시큐리티에서 username과 password를 검증하기 위해서는 token에 담아야 함
            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(username, password, null);

            //token에 담은 검증을 위한 AuthenticationManager로 전달
            return authenticationManager.authenticate(authToken);
        } catch (Exception e) {
            throw new RuntimeException("요청 바디 파싱 실패", e);
        }
    }

    //로그인 성공시 실행하는 메소드 (여기서 JWT를 발급하면 됨)
    @Override
    protected void successfulAuthentication(HttpServletRequest request, HttpServletResponse response, FilterChain chain, Authentication authentication) {

        SecurityContextHolder.getContext().setAuthentication(authentication);
        //유저 정보
        String username = authentication.getName();

        Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();
        Iterator<? extends GrantedAuthority> iterator = authorities.iterator();
        GrantedAuthority auth = iterator.next();
        String role = auth.getAuthority();

        // 권한 정보 출력
        for (GrantedAuthority authority : authorities) {
            System.out.println("권한: " + authority.getAuthority());
        }

        // 현재 SecurityContext에 저장된 인증 정보 확인
        Authentication currentAuth = SecurityContextHolder.getContext().getAuthentication();
        System.out.println("Current Auth: " + currentAuth);
        //토큰 생성
        String access = jwtUtil.createJwt("access", username, role, 600000L);
        String refresh = jwtUtil.createJwt("refresh", username, role, 86400000L);

        //Refresh 토큰 저장
        addRefreshEntity(username, refresh, 86400000L);

        //응답 설정
        response.setHeader("access", access);
        response.addCookie(createCookie("refresh", refresh));
        response.setStatus(HttpStatus.OK.value());
    }

    //로그인 실패시 실행하는 메소드
    @Override
    protected void unsuccessfulAuthentication(HttpServletRequest request, HttpServletResponse response, AuthenticationException failed) {

        System.out.println("로그인 실패: " + failed.getMessage()); // 실패 원인 출력
        //로그인 실패시 401 응답 코드 반환
        response.setStatus(401);
    }

    private void addRefreshEntity(String username, String refresh, Long expiredMs) {

        Date date = new Date(System.currentTimeMillis() + expiredMs);

        RefreshEntity refreshEntity = new RefreshEntity();
        refreshEntity.setUsername(username);
        refreshEntity.setRefresh(refresh);
        refreshEntity.setExpiration(date.toString());

        refreshRepository.save(refreshEntity);
    }

    private Cookie createCookie(String key, String value) {

        Cookie cookie = new Cookie(key, value);
        cookie.setMaxAge(24*60*60);
        // https 사용시 주석해제
        //cookie.setSecure(true);
        // 적용범위 설정
        cookie.setPath("/");
        cookie.setHttpOnly(true);

        return cookie;
    }
}
