package kr.pe.tn.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;



@Controller
public class MainController {

    @GetMapping("/")
    public String mainP(Model model) {

        model.addAttribute("title", "메인 페이지");
        model.addAttribute("message", "환영합니다! Spring Boot + Thymeleaf");
        return "test";

//    @GetMapping("/")
//    public String mainP(Model model) {
//
//        model.addAttribute("title", "메인 페이지");
//        model.addAttribute("message", "환영합니다! Spring Boot + Thymeleaf");
//        return "index";


//        String name = SecurityContextHolder.getContext().getAuthentication().getName();
//
//        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
//
//        Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();
//        Iterator<? extends GrantedAuthority> iter = authorities.iterator();
//        GrantedAuthority auth = iter.next();
//        String role = auth.getAuthority();
//
//        return "main Controller" + name + role;
    }

    @GetMapping("/api/message")
    @ResponseBody
    public String getMessage(@RequestParam(value = "type", defaultValue = "default") String type) {
        switch (type) {
            case "welcome":
                return "환영합니다! 로그인 성공!";
            case "error":
                return "에러가 발생했습니다.";
            default:
                return "기본 메시지입니다.";
        }
    }
}
