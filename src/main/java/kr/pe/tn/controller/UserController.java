package kr.pe.tn.controller;

import kr.pe.tn.dto.UserDTO;
import kr.pe.tn.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public void registerUser(@RequestBody UserDTO user) {
        userService.registerUser(user);
    }

    @PutMapping("/update")
    public void updateUser(@RequestBody UserDTO user) {
        userService.updateUser(user);
    }

    @DeleteMapping("/delete/{id}")
    public void deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
    }

    @GetMapping("/{username}")
    public UserDTO getUserByUsername(@PathVariable String username) {
        return userService.findUserByUsername(username);
    }
}
