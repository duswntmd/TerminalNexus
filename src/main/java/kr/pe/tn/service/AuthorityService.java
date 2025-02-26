//package kr.pe.tn.service;
//
//import kr.pe.tn.dto.AuthorityDTO;
//import kr.pe.tn.mapper.AuthorityMapper;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.stereotype.Service;
//
//@Service
//public class AuthorityService {
//
//    private final AuthorityMapper authorityMapper;
//
//    @Autowired
//    public AuthorityService(AuthorityMapper authorityMapper) {
//        this.authorityMapper = authorityMapper;
//    }
//
//    public void assignAuthorityToUser(Long userId, String authority) {
//        AuthorityDTO authorityDTO = new AuthorityDTO();
//        authorityDTO.setUserId(userId);
//        authorityDTO.setAuthority(authority);
//        authorityMapper.insertAuthority(authorityDTO);
//    }
//
//    public void removeAuthorityFromUser(Long userId) {
//        authorityMapper.deleteAuthorityByUserId(userId);
//    }
//}
