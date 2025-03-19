package kr.pe.tn.controller;

import kr.pe.tn.domain.user.dto.UserRequestDTO;
import kr.pe.tn.domain.user.dto.UserResponseDTO;
import kr.pe.tn.domain.user.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // 🔹 로그인 페이지 렌더링
    @GetMapping("/loginForm")
    public String loginUserPage() {
        return "login";
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser() {
        // 실제 인증 로직은 보통 Spring Security에서 처리하지만,
        // 여기서는 단순히 로그인 시도된 것만 출력해 봄.
        System.out.println("✅ 컨트롤러에서 로그인 시도됨!");
        return ResponseEntity.ok("로그인 성공");
    }

    // 🔹 회원가입 페이지 렌더링
    @GetMapping("/registerForm")
    public String registerUserPage() {
        return "register";
    }

    // 🔹 회원가입 처리
    @PostMapping("/register")
    public String registerUser(@ModelAttribute UserRequestDTO dto, Model model) {
        try {
            userService.createOneUser(dto);  // 회원가입 처리
            return "redirect:/user/loginForm";  // 회원가입 성공 후 로그인 페이지로 이동
        } catch (IllegalArgumentException e) {
            model.addAttribute("error", e.getMessage());  // 에러 메시지 전달
            return "register";  // 에러 메시지와 함께 회원가입 페이지 다시 표시
        }
    }

    // 회원 수정 : 페이지 응답
    @GetMapping("/updateForm/{username}")
    public String updateUserPage(@PathVariable("username") String username, Model model) {
        // 본인 또는 ADMIN 권한만 접근 가능
        if (userService.isAccess(username)) {
            UserResponseDTO dto = userService.readOneUser(username);
            model.addAttribute("USER", dto);
            return "update";  // 사용자 정보 수정 페이지로 이동
        }

        return "redirect:/user/loginForm";  // 권한이 없으면 로그인 페이지로 리다이렉트
    }

    // 회원 수정 : 수행
    @PostMapping("/update/{username}")
    public String updateUser(@PathVariable String username, UserRequestDTO dto) {
        // 본인 또는 ADMIN 권한만 접근 가능
        if (userService.isAccess(username)) {
            userService.updateOneUser(dto, username);  // 유저 정보 업데이트 수행
        }

        return "redirect:/user/update/" + username;  // 수정 후 수정 페이지로 다시 리다이렉트
    }

    // 🔹 유저 삭제 처리 (관리자 권한 필요)
    @GetMapping("/delete/{username}")
    public String deleteUser(@PathVariable String username) {
        // 관리자만 삭제할 수 있도록 권한 체크
        if (userService.isAccess(username)) {
            userService.deleteOneUser(username);  // 유저 삭제 수행
        }
        return "redirect:/user/list";  // 삭제 후 유저 목록 페이지로 리다이렉트
    }

    // 🔹 유저 프로필 페이지 (타임리프에서 유저 정보 출력)
    @GetMapping("/profile")
    public String userProfile(Model model) {
        // 실제 로그인된 유저 정보 가져오기 (여기서는 예시 데이터로 처리)
        model.addAttribute("username", "테스트유저");
        model.addAttribute("email", "test@example.com");
        model.addAttribute("nickname", "테스트닉네임");

        return "profile";  // 프로필 페이지 반환
    }
}
