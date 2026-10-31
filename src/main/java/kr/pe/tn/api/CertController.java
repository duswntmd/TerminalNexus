package kr.pe.tn.api;

import kr.pe.tn.domain.cert.dto.CertDTO;
import kr.pe.tn.domain.cert.service.CertOrderService;
import kr.pe.tn.domain.cert.service.CertService;
import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;

/**
 * 리눅스 자격증 연습 API
 * exam, practice, check, order/webhook 은 비로그인 허용 (SecurityConfig), 나머지는 로그인 필요
 */
@RestController
@RequestMapping("/api/cert")
@RequiredArgsConstructor
public class CertController {

    private final CertService certService;
    private final CertOrderService orderService;
    private final UserRepository userRepository;

    /** 로그인하지 않았으면 null */
    private UserEntity optionalUser(Principal principal) {
        return principal == null ? null : userRepository.findByUsername(principal.getName()).orElse(null);
    }

    private UserEntity user(Principal principal) {
        UserEntity u = optionalUser(principal);
        if (u == null) throw new IllegalStateException("로그인이 필요합니다.");
        return u;
    }

    @GetMapping("/exam")
    public CertDTO.ExamInfo exam() {
        return certService.examInfo();
    }

    @GetMapping("/practice")
    public CertDTO.PracticeResponse practice(@RequestParam(required = false) String subject,
                                             @RequestParam(defaultValue = "10") int count, Principal principal) {
        return certService.practice(optionalUser(principal), subject, count);
    }

    @PostMapping("/check")
    public CertDTO.CheckResponse check(@RequestBody CertDTO.CheckRequest req, Principal principal) {
        return certService.check(optionalUser(principal), req);
    }

    @GetMapping("/me")
    public CertDTO.Me me(Principal principal) {
        return certService.me(user(principal));
    }

    @GetMapping("/wrong")
    public CertDTO.WrongNote wrong(Principal principal) {
        return certService.wrongNote(user(principal));
    }

    @PostMapping("/mock/start")
    public CertDTO.AttemptView start(Principal principal) {
        return certService.start(user(principal));
    }

    @GetMapping("/mock/current")
    public ResponseEntity<CertDTO.AttemptView> current(Principal principal) {
        CertDTO.AttemptView view = certService.current(user(principal));
        return view == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(view);
    }

    @PostMapping("/mock/{id}/submit")
    public CertDTO.ResultView submit(@PathVariable Long id, @RequestBody CertDTO.SubmitRequest req, Principal principal) {
        return certService.submit(user(principal), id, req);
    }

    @GetMapping("/mock/{id}")
    public CertDTO.ResultView result(@PathVariable Long id, Principal principal) {
        return certService.result(user(principal), id);
    }

    @PostMapping("/order/prepare")
    public CertDTO.OrderResponse prepare(@RequestBody CertDTO.OrderRequest req, Principal principal) {
        return orderService.prepare(user(principal), req.planId());
    }

    @PostMapping("/order/verify")
    public Map<String, String> verify(@RequestBody CertDTO.VerifyRequest req, Principal principal) {
        return Map.of("passExpiresAt", orderService.verify(user(principal), req.merchantUid()));
    }

    @PostMapping("/order/webhook")
    public ResponseEntity<Void> webhook(@RequestBody CertDTO.WebhookRequest req) {
        orderService.webhook(req.merchant_uid());
        return ResponseEntity.ok().build();
    }
}
