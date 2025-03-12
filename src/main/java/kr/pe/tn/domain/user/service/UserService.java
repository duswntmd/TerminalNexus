package kr.pe.tn.domain.user.service;

import kr.pe.tn.domain.user.dto.UserRequestDTO;
import kr.pe.tn.domain.user.dto.UserResponseDTO;
import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.entity.UserRoleType;
import kr.pe.tn.domain.user.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    // 유저 한 명 생성
    @Transactional
    public void createOneUser(UserRequestDTO dto) {

        String username = dto.getUsername();
        String password = dto.getPassword();
        String nickname = dto.getNickname();
        String email = dto.getEmail();

        // 동일한 username이 있는지 확인
        if (userRepository.existsByUsername(username)) {
            return;
        }

        // 유저에 대한 Entity 생성 : DTO -> Entity 및 추가 정보 set
        UserEntity entity = new UserEntity();
        entity.setUsername(username);
        entity.setPassword(bCryptPasswordEncoder.encode(password));
        entity.setNickname(nickname);
        entity.setEmail(email);
        entity.setRole(UserRoleType.ROLE_USER);

        // Entity 저장
        userRepository.save(entity);
    }

    // 유저 한 명 읽기
    @Transactional(readOnly = true)
    public UserResponseDTO readOneUser(String username) {

        UserEntity entity = userRepository.findByUsername(username).orElseThrow();

        UserResponseDTO dto = new UserResponseDTO();
        dto.setUsername(entity.getUsername());
        dto.setNickname(entity.getNickname());
        dto.setEmail(entity.getEmail());
        dto.setRole(entity.getRole().toString());

        return dto;
    }

    // 유저 한 명 수정
    @Transactional
    public void updateOneUser(UserRequestDTO dto, String username) {

        // 기존 유저 정보 읽기
        UserEntity entity = userRepository.findByUsername(username).orElseThrow();

        if (dto.getPassword() != null && !dto.getPassword().isEmpty()) {
            entity.setPassword(bCryptPasswordEncoder.encode(dto.getPassword()));
        }

        if (dto.getNickname() != null && !dto.getNickname().isEmpty()) {
            entity.setNickname(dto.getNickname());
        }

        userRepository.save(entity);
    }

    // 유저 한 명 삭제
    @Transactional
    public void deleteOneUser(String username) {

        userRepository.deleteByUsername(username);
    }

    // 유저 한 명 삭제
//    @Transactional
//    public void deleteOneUser(String username) {
//
//        userRepository.deleteByUsername(username);
//    }

//    public void joinProcess(UserRequestDTO joinDTO) {
//
//        String username = joinDTO.getUsername();
//        String password = joinDTO.getPassword();
//        String email = joinDTO.getEmail();
//        String nickname = joinDTO.getNickname();
//
//
//        if (userRepository.existsByUsername(username)) {
//            throw new IllegalArgumentException("이미 사용 중인 아이디입니다.");
//        }
//        if (userRepository.existsByNickname(nickname)) {
//            throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
//        }
//        if (userRepository.existsByEmail(email)) {
//            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
//        }
//
//
//        UserEntity user = new UserEntity();
//        user.setUsername(username);
//        user.setPassword(bCryptPasswordEncoder.encode(password));
//        user.setNickname(nickname);
//        user.setEmail(email);
//        user.setRole("ROLE_USER");
//
//        userRepository.save(user);
//    }
}
