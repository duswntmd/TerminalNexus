package kr.pe.tn.controller;

import kr.pe.tn.domain.user.dto.UserRequestDTO;
import kr.pe.tn.domain.user.dto.UserResponseDTO;
//import kr.pe.tn.domain.user.service.UserService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/user")
public class UserController {

//    private final UserService userService;
//
//    public UserController(UserService userService) {
//        this.userService = userService;
//    }

    // 🔹 로그인 페이지 렌더링
    @GetMapping("/loginForm")
    public String loginUserPage() {
        return "login";
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser() {
        System.out.println("✅ 컨트롤러에서 로그인 시도됨! username: ");
        return ResponseEntity.ok("로그인 성공");
    }

//    // 🔹 회원가입 페이지 렌더링
//    @GetMapping("/register")
//    public String registerUserPage() {
//        return "register";
//    }
//
//    // 🔹 회원가입 처리
//    @PostMapping("/register")
//    public String registerUser(@ModelAttribute UserRequestDTO dto, Model model) {
//        try {
//            userService.createOneUser(dto);
//            return "redirect:/user/profile";  // 회원가입 성공 후 로그인 페이지로 이동
//        } catch (IllegalArgumentException e) {
//            model.addAttribute("error", e.getMessage());
//            return "register";  // 에러 메시지와 함께 회원가입 페이지 다시 표시
//        }
//    }
//
//    // 회원 수정 : 페이지 응답
//    @GetMapping("/update/{username}")
//    public String updateUserPage(@PathVariable("username") String username, Model model) {
//
//        // 본인 또는 ADMIN 권한만 접근 가능
//        if (userService.isAccess(username)) {
//            UserResponseDTO dto = userService.readOneUser(username);
//            model.addAttribute("USER", dto);
//            return "update";
//        }
//
//        return "redirect:/user/login";
//    }
//
//    // 회원 수정 : 수행
//    @PostMapping("/update/{username}")
//    public String updateUser(@PathVariable String username, UserRequestDTO dto) {
//
//        // 본인 또는 ADMIN 권한만 접근 가능
//        if (userService.isAccess(username)) {
//            userService.updateOneUser(dto, username);
//        }
//
//        return "redirect:/user/update/" + username;
//    }

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
