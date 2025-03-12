package kr.pe.tn.domain.user.repository;

import jakarta.transaction.Transactional;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Integer> {

    Boolean existsByUsername(String username);

    Boolean existsByNickname(String nickname);

    Boolean existsByEmail(String email);

    //username을 받아 DB 테이블에서 회원을 조회하는 메소드 작성
    Optional<UserEntity> findByUsername(String username);

    @Transactional
    void deleteByUsername(String username);
}
