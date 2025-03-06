//package kr.pe.tn.controller;
//
//import kr.pe.tn.domain.user.dto.UserRequestDTO;
//import kr.pe.tn.domain.user.service.UserService;
//import org.springframework.stereotype.Controller;
//import org.springframework.web.bind.annotation.PostMapping;
//import org.springframework.web.bind.annotation.ResponseBody;
//
//@Controller
//@ResponseBody
//public class JoinController {
//
//    private final UserService joinService;
//
//    public JoinController(UserService joinService) {
//
//        this.joinService = joinService;
//    }
//
//    @PostMapping("/join")
//    public String joinProcess(UserRequestDTO joinDTO) {
//
////        System.out.println(joinDTO.getUsername());
//        joinService.joinProcess(joinDTO);
//
//        return "ok";
//    }
//}
