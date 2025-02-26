//package kr.pe.tn.service;
//
//import kr.pe.tn.domain.User;
//import kr.pe.tn.domain.Authority;
//import kr.pe.tn.repository.UserRepository;
//import kr.pe.tn.repository.AuthorityRepository;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
//import org.springframework.security.crypto.password.PasswordEncoder;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.util.Collections;
//
//@Service
//public class UserService {
//
//    private final UserRepository userRepository;
//    private final AuthorityRepository authorityRepository;
//    private final PasswordEncoder passwordEncoder;
//
//    @Autowired
//    public UserService(UserRepository userRepository, AuthorityRepository authorityRepository) {
//        this.userRepository = userRepository;
//        this.authorityRepository = authorityRepository;
//        this.passwordEncoder = new BCryptPasswordEncoder();  // 패스워드 암호화를 위한 인코더
//    }
//
//    @Transactional
//    public User registerUser(String username, String password, String name, String email, String nickname) {
//        // 사용자 이름이 중복되는지 체크
//        if (userRepository.findByUsername(username).isPresent()) {
//            throw new IllegalArgumentException("Username already taken");
//        }
//
//        // 이메일 중복 체크
//        if (userRepository.findByEmail(email).isPresent()) {
//            throw new IllegalArgumentException("Email already taken");
//        }
//
//        // 닉네임 중복 체크
//        if (userRepository.findByNickname(nickname).isPresent()) {
//            throw new IllegalArgumentException("Nickname already taken");
//        }
//
//        // 비밀번호 암호화
//        String encodedPassword = passwordEncoder.encode(password);
//
//        // 사용자 생성
//        User user = new User();
//        user.setUsername(username);
//        user.setPassword(encodedPassword);
//        user.setName(name);
//        user.setEmail(email);
//        user.setNickname(nickname);
//
//        // 권한 부여
//        Authority authority = new Authority();
//        authority.setUser(user);
//        authority.setAuthority("ROLE_USER");  // 기본 권한은 ROLE_USER
//
//        // 사용자 저장
//        user = userRepository.save(user);
//        authorityRepository.save(authority);
//
//        return user;
//    }
//
//    // 추가적인 서비스 메서드들 (로그인, 권한 변경 등) 구현 가능
//}
