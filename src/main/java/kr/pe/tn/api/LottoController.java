package kr.pe.tn.api;

import kr.pe.tn.domain.lotto.dto.LottoDTO;
import kr.pe.tn.domain.lotto.service.LottoService;
import kr.pe.tn.domain.lotto.service.LottoTicketService;
import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * 로또 6/45 당첨번호 조회 API (로그인 불필요), /my 아래는 내 번호·알림 (로그인 필요)
 */
@RestController
@RequestMapping("/api/lotto")
@RequiredArgsConstructor
public class LottoController {

    private final LottoService lottoService;
    private final LottoTicketService ticketService;
    private final UserRepository userRepository;

    private UserEntity getUser(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
    }

    /** 최신 회차 상세 */
    @GetMapping("/latest")
    public ResponseEntity<LottoDTO.DrawDetail> getLatest() {
        String next = lottoService.getNextDrawDate().map(LocalDate::toString).orElse(null);
        return lottoService.getLatestLotto()
                .map(e -> ResponseEntity.ok(LottoDTO.DrawDetail.of(e, next)))
                .orElse(ResponseEntity.noContent().build());
    }

    /** 특정 회차 상세 */
    @GetMapping("/draw/{drwNo}")
    public ResponseEntity<LottoDTO.DrawDetail> getDraw(@PathVariable long drwNo) {
        return lottoService.getLottoByDrwNo(drwNo)
                .map(e -> ResponseEntity.ok(LottoDTO.DrawDetail.of(e, null)))
                .orElse(ResponseEntity.notFound().build());
    }

    /** 전 회차 번호 목록 (최신순) */
    @GetMapping("/draws")
    public ResponseEntity<List<LottoDTO.DrawSummary>> getDraws() {
        List<LottoDTO.DrawSummary> list = lottoService.getAll().stream().map(LottoDTO.DrawSummary::of).toList();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic())
                .body(list);
    }

    /** 내 번호·알림·수신 설정 */
    @GetMapping("/my")
    public LottoDTO.MyLotto getMine(Principal principal) {
        return ticketService.getMine(getUser(principal));
    }

    /** 헤더 표시용 안 읽은 알림 수 */
    @GetMapping("/my/unread")
    public Map<String, Long> getUnread(Principal principal) {
        return Map.of("count", ticketService.unreadCount(getUser(principal)));
    }

    @PostMapping("/my/tickets")
    public LottoDTO.TicketResponse addTicket(@RequestBody LottoDTO.TicketRequest req, Principal principal) {
        return ticketService.addTicket(getUser(principal), req);
    }

    @DeleteMapping("/my/tickets/{id}")
    public ResponseEntity<Void> deleteTicket(@PathVariable Long id, Principal principal) {
        ticketService.deleteTicket(getUser(principal), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/my/alerts/read")
    public ResponseEntity<Void> markRead(Principal principal) {
        ticketService.markAllRead(getUser(principal));
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/my/email")
    public ResponseEntity<Void> setEmail(@RequestBody LottoDTO.EmailRequest req, Principal principal) {
        ticketService.setEmail(getUser(principal), req.on());
        return ResponseEntity.noContent().build();
    }
}
