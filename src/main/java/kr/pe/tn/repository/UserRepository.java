package kr.pe.tn.repository;

import kr.pe.tn.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Integer> {

    Boolean existsByUsername(String username);

    Boolean existsByEmail(String email);

    Boolean existsByNickname(String nickname);

    //username을 받아 DB 테이블에서 회원을 조회하는 메소드 작성
    UserEntity findByUsername(String username);

}
