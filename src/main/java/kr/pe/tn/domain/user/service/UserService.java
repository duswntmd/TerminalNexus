package kr.pe.tn.domain.user.service;

import kr.pe.tn.domain.user.dto.UserRequestDTO;
import kr.pe.tn.domain.user.dto.UserResponseDTO;
import kr.pe.tn.domain.user.entity.AuthProvider;
import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.entity.UserRoleType;
import kr.pe.tn.domain.user.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Pattern;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;

    public UserService(UserRepository userRepository, BCryptPasswordEncoder bCryptPasswordEncoder) {
        this.userRepository = userRepository;
        this.bCryptPasswordEncoder = bCryptPasswordEncoder;
    }

    // 유저 접근 권한 체크
    public Boolean isAccess(String username) {
        // 현재 로그인 되어 있는 유저의 username
        String sessionUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        // 현재 로그인 되어 있는 유저의 role
        String sessionRole = SecurityContextHolder.getContext().getAuthentication().getAuthorities().iterator().next().getAuthority();

        // 수직적으로 ADMIN이면 무조건 접근 가능
        if ("ROLE_ADMIN".equals(sessionRole)) {
            return true;
        }

        // 수평적으로 특정 행위를 수행할 username에 대해 세션(현재 로그인한) username과 같은지
        if (username.equals(sessionUsername)) {
            return true;
        }

        // 나머지 다 불가
        return false;
    }

    // 비밀번호 강도 체크
//    private void validatePasswordStrength(String password) {
//        // 최소 8자 이상, 대문자, 소문자, 숫자, 특수문자 포함
//        if (!Pattern.matches("^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*()_+]).{8,}$", password)) {
//            throw new IllegalArgumentException("비밀번호는 8자 이상, 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다.");
//        }
//    }

    // 이메일 형식 검증
    private void validateEmailFormat(String email) {
        if (!Pattern.matches("^[A-Za-z0-9+_.-]+@(.+)$", email)) {
            throw new IllegalArgumentException("잘못된 이메일 형식입니다.");
        }
    }

    // 유저 한 명 생성
    @Transactional
    public void createOneUser(UserRequestDTO dto) {

        String username = dto.getUsername();
        String password = dto.getPassword();
        String nickname = dto.getNickname();
        String email = dto.getEmail();

        // 동일한 username이 있는지 확인
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("이미 사용 중인 아이디입니다.");
        }
        // 동일한 닉네임이 있는지 확인
        if (userRepository.existsByNickname(nickname)) {
            throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
        }
        // 동일한 이메일이 있는지 확인
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        // 비밀번호 강도 체크
//        validatePasswordStrength(password);

        // 이메일 형식 검증
        validateEmailFormat(email);

        // 유저에 대한 Entity 생성 : DTO -> Entity 및 추가 정보 set
        UserEntity user = new UserEntity();
        user.setUsername(username);
        user.setPassword(bCryptPasswordEncoder.encode(password));
        user.setNickname(nickname);
        user.setEmail(email);
        user.setRole(UserRoleType.ROLE_USER);
        user.setProvider(AuthProvider.LOCAL);

        // Entity 저장
        userRepository.save(user);
    }

    // 유저 한 명 읽기
    @Transactional(readOnly = true)
    public UserResponseDTO readOneUser(String username) {

        UserEntity user = userRepository.findByUsername(username);

        if (user == null) {
            throw new IllegalArgumentException("유저를 찾을 수 없습니다.");
        }

        UserResponseDTO dto = new UserResponseDTO();
        dto.setUsername(user.getUsername());
        dto.setNickname(user.getNickname());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole().toString());

        return dto;
    }

    // 유저 한 명 수정
    @Transactional
    public void updateOneUser(UserRequestDTO dto, String username) {

        // 기존 유저 정보 읽기
        UserEntity user = userRepository.findByUsername(username);

        if (user == null) {
            throw new IllegalArgumentException("유저를 찾을 수 없습니다.");
        }

        if (dto.getPassword() != null && !dto.getPassword().isEmpty()) {
            // 비밀번호 강도 체크
//            validatePasswordStrength(dto.getPassword());
            user.setPassword(bCryptPasswordEncoder.encode(dto.getPassword()));
        }

        if (dto.getNickname() != null && !dto.getNickname().isEmpty()) {
            user.setNickname(dto.getNickname());
        }

        userRepository.save(user);
    }

    // 유저 한 명 삭제
    @Transactional
    public void deleteOneUser(String username) {

        UserEntity user = userRepository.findByUsername(username);

        if (user == null) {
            throw new IllegalArgumentException("유저를 찾을 수 없습니다.");
        }

        userRepository.delete(user);
    }
}
