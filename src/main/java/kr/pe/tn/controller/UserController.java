//package kr.pe.tn.controller;
//
//import kr.pe.tn.security.JwtUtil;
//import kr.pe.tn.service.UserService;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.ResponseEntity;
//import org.springframework.security.authentication.AuthenticationManager;
//import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
//import org.springframework.web.bind.annotation.*;
//
//@RestController
//@RequestMapping("/users")
//public class UserController {
//
//    @Autowired
//    private UserService userService;
//
//    @Autowired
//    private JwtUtil jwtUtil;
//
//    @Autowired
//    private AuthenticationManager authenticationManager;
//
//    @PostMapping("/login")
//    public ResponseEntity<String> login(@RequestParam String username, @RequestParam String password) {
//        // 로그인 인증 처리
//        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password));
//
//        // JWT 토큰 생성
//        String token = jwtUtil.generateToken(username);
//        return ResponseEntity.ok("Bearer " + token);
//    }
//}
