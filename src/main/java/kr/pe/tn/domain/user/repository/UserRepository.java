package kr.pe.tn.domain.user.repository;

import jakarta.transaction.Transactional;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Boolean existsByUsername(String username);

//    Boolean existsByNickname(String nickname);

    Boolean existsByEmail(String email);

    //username을 받아 DB 테이블에서 회원을 조회하는 메소드 작성
    UserEntity findByUsername(String username);

    public boolean existsByNickname(String nickname);

    @Transactional
    void deleteByUsername(String username);
}
