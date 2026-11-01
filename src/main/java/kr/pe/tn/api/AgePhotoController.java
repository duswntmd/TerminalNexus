package kr.pe.tn.api;

import kr.pe.tn.domain.agephoto.service.AgePhotoService;
import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;

/** 나이 변환 사진 API (로그인 필요, SecurityConfig) */
@RestController
@RequestMapping("/api/age-photo")
@RequiredArgsConstructor
public class AgePhotoController {

    private final AgePhotoService agePhotoService;
    private final UserRepository userRepository;

    private Long userId(Principal principal) {
        UserEntity user = principal == null ? null : userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null) throw new IllegalStateException("로그인이 필요합니다.");
        return user.getId();
    }

    @GetMapping
    public AgePhotoService.Info info(Principal principal) {
        return agePhotoService.info(userId(principal));
    }

    @PostMapping
    public AgePhotoService.Result generate(@RequestParam MultipartFile photo, @RequestParam String target,
                                           @RequestParam(defaultValue = "false") boolean consent,
                                           Principal principal) throws IOException {
        return agePhotoService.generate(userId(principal), target, photo.getBytes(), consent);
    }
}
