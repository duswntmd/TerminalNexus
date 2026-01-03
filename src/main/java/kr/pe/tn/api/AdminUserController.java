package kr.pe.tn.api;

import kr.pe.tn.domain.user.dto.AdminUserDTO;
import kr.pe.tn.domain.user.dto.AdminUserUpdateDTO;
import kr.pe.tn.domain.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 관리자 전용 회원 관리 Controller
 * ADMIN 권한이 있는 사용자만 접근 가능
 */
@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;

    /**
     * 전체 회원 목록 조회
     * GET /admin/users
     */
    @GetMapping
    public ResponseEntity<List<AdminUserDTO>> getAllUsers() throws AccessDeniedException {
        List<AdminUserDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    /**
     * 특정 회원 정보 조회
     * GET /admin/users/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<AdminUserDTO> getUserById(@PathVariable Long id) throws AccessDeniedException {
        AdminUserDTO user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    /**
     * 회원 정보 수정
     * PUT /admin/users/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<Long> updateUser(
            @PathVariable Long id,
            @RequestBody AdminUserUpdateDTO dto) throws AccessDeniedException {

        dto.setId(id); // PathVariable의 ID를 DTO에 설정
        Long updatedId = userService.updateUserByAdmin(dto);
        return ResponseEntity.ok(updatedId);
    }

    /**
     * 회원 삭제
     * DELETE /admin/users/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) throws AccessDeniedException {
        userService.deleteUserByAdmin(id);
        return ResponseEntity.noContent().build();
    }
}
