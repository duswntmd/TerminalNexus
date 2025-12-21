package kr.pe.tn.util;

import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.entity.UserRoleType;
import kr.pe.tn.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * 권한 검증 유틸리티
 * 게시글/댓글의 작성자 본인 또는 관리자 여부를 검증합니다.
 */
@Component
@RequiredArgsConstructor
public class PermissionValidator {

    private final UserRepository userRepository;

    /**
     * 현재 인증된 사용자명을 가져옵니다.
     */
    public String getCurrentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    /**
     * 현재 사용자가 작성자 본인인지 확인합니다.
     */
    public boolean isWriter(String writerUsername) {
        String currentUsername = getCurrentUsername();
        return currentUsername.equals(writerUsername);
    }

    /**
     * 현재 사용자가 관리자인지 확인합니다.
     */
    public boolean isAdmin() {
        UserEntity currentUser = userRepository.findByUsernameAndIsLock(getCurrentUsername(), false)
                .orElse(null);
        return currentUser != null && currentUser.getRoleType() == UserRoleType.ADMIN;
    }

    /**
     * 작성자 본인 또는 관리자인지 확인합니다.
     */
    public boolean canModify(String writerUsername) {
        return isWriter(writerUsername) || isAdmin();
    }

    /**
     * 작성자 본인 또는 관리자가 아니면 예외를 발생시킵니다.
     */
    public void validateModifyPermission(String writerUsername, String errorMessage) {
        if (!canModify(writerUsername)) {
            throw new AccessDeniedException(errorMessage);
        }
    }

    /**
     * 작성자 본인 확인 (관리자 권한 없음)
     */
    public void validateWriterOnly(String writerUsername, String errorMessage) {
        if (!isWriter(writerUsername)) {
            throw new AccessDeniedException(errorMessage);
        }
    }
}
