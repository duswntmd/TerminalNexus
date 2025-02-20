package kr.pe.tn.service;

import kr.pe.tn.dto.UserDTO;
import kr.pe.tn.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserMapper userMapper;

    @Autowired
    public UserService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    public UserDTO findUserByUsername(String username) {
        return userMapper.findByUsername(username);
    }

    public void registerUser(UserDTO user) {
        userMapper.insertUser(user);
    }

    public void updateUser(UserDTO user) {
        userMapper.updateUser(user);
    }

    public void deleteUser(Long id) {
        userMapper.deleteUser(id);
    }
}
