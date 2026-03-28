package kr.pe.tn.api;

import kr.pe.tn.domain.donation.dto.DonationDTO;
import kr.pe.tn.domain.donation.service.DonationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/donation")
@RequiredArgsConstructor
public class DonationController {

    private final DonationService donationService;

    /**
     * Step 1: 사전 결제 등록
     * 포트원 결제창 호출 전, 금액을 DB에 먼저 저장 (위변조 방지)
     * POST /api/donation/prepare
     */
    @PostMapping("/prepare")
    public ResponseEntity<DonationDTO.Response> prepare(
            @RequestBody DonationDTO.PrepareRequest request) {
        return ResponseEntity.status(201).body(donationService.prepare(request));
    }

    /**
     * Step 2: 결제 서버 검증
     * 포트원 결제 완료 후 imp_uid로 서버에서 금액 검증
     * POST /api/donation/verify
     */
    @PostMapping("/verify")
    public ResponseEntity<DonationDTO.Response> verify(
            @RequestBody DonationDTO.VerifyRequest request) {
        return ResponseEntity.ok(donationService.verify(request));
    }

    /**
     * 내 후원 내역 조회
     * GET /api/donation/my
     */
    @GetMapping("/my")
    public ResponseEntity<List<DonationDTO.Response>> getMyHistory() {
        return ResponseEntity.ok(donationService.getMyHistory());
    }

    /**
     * 전체 후원 현황 (공개) - 최근 완료된 후원 목록
     * GET /api/donation/public
     */
    @GetMapping("/public")
    public ResponseEntity<List<DonationDTO.Response>> getPublicHistory() {
        return ResponseEntity.ok(donationService.getPublicHistory());
    }
}
