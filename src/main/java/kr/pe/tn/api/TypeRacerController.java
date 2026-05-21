package kr.pe.tn.api;

import jakarta.validation.Valid;
import kr.pe.tn.domain.typeracer.dto.TypeRacerRequestDTO;
import kr.pe.tn.domain.typeracer.dto.TypeRacerResponseDTO;
import kr.pe.tn.domain.typeracer.service.TypeRacerRecordService;
import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/typeracer")
@RequiredArgsConstructor
public class TypeRacerController {

    private final TypeRacerRecordService typeRacerRecordService;
    private final UserRepository userRepository;

    /**
     * 타자 게임 기록 저장 및 갱신 API (로그인 필수)
     */
    @PostMapping("/score")
    public ResponseEntity<String> saveScore(
            Principal principal,
            @Valid @RequestBody TypeRacerRequestDTO dto) {

        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요한 서비스입니다.");
        }

        // 로그인된 유저 정보 가져오기 (잠금 상태가 아닌 활성 유저)
        UserEntity user = userRepository.findByUsernameAndIsLock(principal.getName(), false)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 비활성화된 사용자입니다."));

        boolean isUpdated = typeRacerRecordService.saveOrUpdateRecord(user, dto);

        if (isUpdated) {
            return ResponseEntity.ok("축하합니다! 최고 기록이 경신되었습니다.");
        } else {
            return ResponseEntity.ok("기록이 성공적으로 저장되었습니다. (기존 최고 기록에는 미치지 못했습니다.)");
        }
    }

    /**
     * 실시간 Top 10 리더보드 조회 API (비로그인 허용)
     */
    @GetMapping("/leaderboard")
    public ResponseEntity<List<TypeRacerResponseDTO>> getLeaderboard() {
        List<TypeRacerResponseDTO> leaderboard = typeRacerRecordService.getTop10Leaderboard();
        return ResponseEntity.ok(leaderboard);
    }
}
