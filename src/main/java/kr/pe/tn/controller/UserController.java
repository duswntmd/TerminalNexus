package kr.pe.tn.controller;

import kr.pe.tn.dto.JoinDTO;
import kr.pe.tn.service.JoinService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/users")
public class UserController {

    private final JoinService joinService;

    public UserController(JoinService joinService) {
        this.joinService = joinService;
    }

    // 🔹 회원가입 페이지 렌더링
    @GetMapping("/register")
    public String showRegisterPage() {
        return "register";
    }

    // 🔹 로그인 페이지 렌더링
    @GetMapping("/login")
    public String showLoginPage() {
        return "login";
    }

    @PostMapping("/login")
    public ResponseEntity<?> login() {
        System.out.println("✅ 컨트롤러에서 로그인 시도됨! username: ");
        return ResponseEntity.ok("로그인 성공");
    }


    // 🔹 회원가입 처리
    @PostMapping("/register")
    public String registerUser(@ModelAttribute JoinDTO joinDTO, Model model) {
        try {
            joinService.joinProcess(joinDTO);
            return "redirect:/profile";  // 회원가입 성공 후 로그인 페이지로 이동
        } catch (IllegalArgumentException e) {
            model.addAttribute("error", e.getMessage());
            return "register";  // 에러 메시지와 함께 회원가입 페이지 다시 표시
        }
    }

    // 🔹 유저 프로필 페이지 (타임리프에서 유저 정보 출력)
    @GetMapping("/profile")
    public String userProfile(Model model) {
        // 실제 로그인된 유저 정보 가져와야 함 (지금은 예시 데이터)
        model.addAttribute("username", "테스트유저");
        model.addAttribute("email", "test@example.com");
        model.addAttribute("nickname", "테스트닉네임");

        return "profile";
    }
}
