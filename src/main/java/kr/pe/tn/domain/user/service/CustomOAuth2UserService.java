package kr.pe.tn.domain.user.service;

import kr.pe.tn.domain.user.dto.CustomOAuth2User;
import kr.pe.tn.domain.user.dto.GoogleReponse;
import kr.pe.tn.domain.user.dto.NaverResponse;
import kr.pe.tn.domain.user.dto.OAuth2Response;
import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.entity.UserRoleType;
import kr.pe.tn.domain.user.entity.AuthProvider;
import kr.pe.tn.domain.user.repository.UserRepository;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {
    private final UserRepository userRepository;

    public CustomOAuth2UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();

        OAuth2Response oAuth2Response = null;
        if (registrationId.equals("naver")) {
            oAuth2Response = new NaverResponse(oAuth2User.getAttributes());
        } else if (registrationId.equals("google")) {
            oAuth2Response = new GoogleReponse(oAuth2User.getAttributes());
        } else {
            return null;
        }

        String username = oAuth2Response.getEmail() + "_" + registrationId.toUpperCase();
        String nickname = oAuth2Response.getName();

        // 최초 생성 시 UUID 붙여서 유니크한 닉네임 생성
        String uniqueNickname = nickname + "@" + UUID.randomUUID().toString();

        // 중복 체크: UUID가 붙은 닉네임이 중복되면 다시 생성
        while (userRepository.existsByNickname(uniqueNickname)) {
            uniqueNickname = nickname + "@" + UUID.randomUUID().toString();
        }

        UserEntity existData = userRepository.findByUsername(username);

        String role = "ROLE_USER";
        if (existData == null) {
            // 새로운 사용자 생성
            UserEntity userEntity = new UserEntity();
            userEntity.setUsername(username);
            userEntity.setEmail(oAuth2Response.getEmail());
            userEntity.setNickname(uniqueNickname);  // 유니크한 닉네임 사용
            userEntity.setRole(UserRoleType.ROLE_USER);
            userEntity.setProvider(AuthProvider.valueOf(registrationId.toUpperCase()));

            userRepository.save(userEntity);
        } else {
            // 기존 사용자 업데이트
            existData.setUsername(username);
            existData.setEmail(oAuth2Response.getEmail());
            existData.setNickname(uniqueNickname);  // 유니크한 닉네임 사용
            existData.setProvider(AuthProvider.valueOf(registrationId.toUpperCase()));

            role = String.valueOf(existData.getRole());

            userRepository.save(existData);
        }

        return new CustomOAuth2User(oAuth2Response, role);
    }
}
