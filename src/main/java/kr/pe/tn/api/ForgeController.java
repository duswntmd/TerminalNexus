package kr.pe.tn.api;

import kr.pe.tn.domain.forge.dto.ForgeRecordRequestDTO;
import kr.pe.tn.domain.forge.dto.ForgeRecordResponseDTO;
import kr.pe.tn.domain.forge.service.ForgeRecordService;
import kr.pe.tn.domain.user.dto.UserResponseDTO;
import kr.pe.tn.domain.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

/**
 * 강화 게임 API
 *
 * POST /api/forge/record       - 내 기록 저장/갱신
 * GET  /api/forge/leaderboard  - 전체 랭킹 TOP 20
 * GET  /api/forge/record/me    - 내 기록 조회
 */
@RestController
@RequestMapping("/api/forge")
@RequiredArgsConstructor
public class ForgeController {

    private final ForgeRecordService forgeRecordService;
    private final UserService userService;

    /** 기록 저장/갱신 (로그인 필수) */
    @PostMapping("/record")
    public ResponseEntity<ForgeRecordResponseDTO> saveRecord(
            Principal principal,
            @RequestBody ForgeRecordRequestDTO dto) {

        String username = principal.getName();
        // 닉네임은 UserService에서 조회
        UserResponseDTO userInfo = userService.readUser();
        String nickname = userInfo.nickname() != null ? userInfo.nickname() : username;

        ForgeRecordResponseDTO result = forgeRecordService.saveRecord(username, nickname, dto);
        return ResponseEntity.ok(result);
    }

    /** 전체 랭킹 TOP 20 (공개) */
    @GetMapping("/leaderboard")
    public ResponseEntity<List<ForgeRecordResponseDTO>> getLeaderboard() {
        return ResponseEntity.ok(forgeRecordService.getLeaderboard());
    }

    /** 내 기록 조회 (로그인 필수) */
    @GetMapping("/record/me")
    public ResponseEntity<ForgeRecordResponseDTO> getMyRecord(Principal principal) {
        ForgeRecordResponseDTO record = forgeRecordService.getMyRecord(principal.getName());
        if (record == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(record);
    }
}
