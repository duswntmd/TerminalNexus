package kr.pe.tn.domain.lotto.service;

import kr.pe.tn.domain.lotto.dto.LottoDTO;
import kr.pe.tn.domain.lotto.entity.LottoAlertEntity;
import kr.pe.tn.domain.lotto.entity.LottoEntity;
import kr.pe.tn.domain.lotto.entity.LottoPrefEntity;
import kr.pe.tn.domain.lotto.entity.LottoTicketEntity;
import kr.pe.tn.domain.lotto.event.LottoDrawAddedEvent;
import kr.pe.tn.domain.lotto.repository.LottoAlertRepository;
import kr.pe.tn.domain.lotto.repository.LottoPrefRepository;
import kr.pe.tn.domain.lotto.repository.LottoTicketRepository;
import kr.pe.tn.domain.user.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 내 로또 번호 저장 + 새 회차 결과 알림
 * - 알림은 사이트 안에 항상 쌓이고, 메일은 SMTP가 설정되고 본인이 켠 경우에만 발송
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LottoTicketService {

    public static final int MAX_TICKETS = 20;

    private final LottoTicketRepository ticketRepository;
    private final LottoAlertRepository alertRepository;
    private final LottoPrefRepository prefRepository;
    private final LottoService lottoService;
    private final ObjectProvider<JavaMailSender> mailSender;

    @Value("${lotto.mail-from:}")
    private String mailFrom;

    /** 1~5등, 낙첨이면 0 */
    public static int rankOf(List<Integer> mine, LottoEntity draw) {
        List<Integer> winning = draw.numbers();
        long hit = mine.stream().filter(winning::contains).count();
        if (hit == 6) return 1;
        if (hit == 5) return mine.contains(draw.getBnusNo()) ? 2 : 3;
        if (hit == 4) return 4;
        if (hit == 3) return 5;
        return 0;
    }

    static String normalize(List<Integer> numbers) {
        if (numbers == null || numbers.size() != 6 || numbers.stream().anyMatch(n -> n == null || n < 1 || n > 45)
                || numbers.stream().distinct().count() != 6) {
            throw new IllegalArgumentException("1~45 사이의 서로 다른 번호 6개를 골라 주세요.");
        }
        return numbers.stream().sorted().map(String::valueOf).collect(Collectors.joining(","));
    }

    private LottoDTO.TicketResponse toResponse(LottoTicketEntity t, LottoEntity latest) {
        List<Integer> nums = t.numberList();
        return new LottoDTO.TicketResponse(t.getId(), nums, t.getLabel(), latest == null ? null : rankOf(nums, latest));
    }

    private boolean mailReady() {
        return mailSender.getIfAvailable() != null && !mailFrom.isBlank();
    }

    @Transactional(readOnly = true)
    public LottoDTO.MyLotto getMine(UserEntity user) {
        LottoEntity latest = lottoService.getLatestLotto().orElse(null);
        List<LottoDTO.TicketResponse> tickets = ticketRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(t -> toResponse(t, latest)).toList();
        List<LottoDTO.AlertResponse> alerts = alertRepository.findTop10ByUserOrderByDrwNoDesc(user).stream()
                .map(LottoDTO.AlertResponse::of).toList();
        boolean emailOn = prefRepository.findById(user.getId()).map(LottoPrefEntity::getEmailOn).orElse(false);
        boolean hasEmail = user.getEmail() != null && !user.getEmail().isBlank();
        return new LottoDTO.MyLotto(tickets, alerts, emailOn, mailReady(), hasEmail, MAX_TICKETS);
    }

    @Transactional
    public LottoDTO.TicketResponse addTicket(UserEntity user, LottoDTO.TicketRequest req) {
        String numbers = normalize(req.numbers());
        if (ticketRepository.countByUser(user) >= MAX_TICKETS) {
            throw new IllegalStateException("번호는 " + MAX_TICKETS + "개까지 저장할 수 있어요.");
        }
        if (ticketRepository.existsByUserAndNumbers(user, numbers)) {
            throw new IllegalStateException("이미 저장한 번호예요.");
        }
        String label = req.label() == null ? null : req.label().trim();
        if (label != null && label.isEmpty()) label = null;
        if (label != null && label.length() > 30) label = label.substring(0, 30);
        LottoTicketEntity saved = ticketRepository.save(
                LottoTicketEntity.builder().user(user).numbers(numbers).label(label).build());
        return toResponse(saved, lottoService.getLatestLotto().orElse(null));
    }

    @Transactional
    public void deleteTicket(UserEntity user, Long id) {
        LottoTicketEntity t = ticketRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new IllegalArgumentException("번호를 찾을 수 없어요."));
        ticketRepository.delete(t);
    }

    @Transactional(readOnly = true)
    public long unreadCount(UserEntity user) {
        return alertRepository.countByUserAndReadFalse(user);
    }

    @Transactional
    public void markAllRead(UserEntity user) {
        alertRepository.markAllRead(user);
    }

    @Transactional
    public void setEmail(UserEntity user, boolean on) {
        LottoPrefEntity pref = prefRepository.findById(user.getId()).orElse(null);
        if (pref == null) prefRepository.save(new LottoPrefEntity(user.getId(), on));
        else pref.setEmailOn(on);
    }

    /** 새 회차 저장 직후: 번호를 저장한 사용자마다 알림 1건 생성 */
    @EventListener
    @Transactional
    public void onDrawAdded(LottoDrawAddedEvent event) {
        LottoEntity draw = event.draw();
        if (alertRepository.existsByDrwNo(draw.getDrwNo())) return; // 재실행 시 중복 방지

        Map<Long, List<LottoTicketEntity>> byUser = new LinkedHashMap<>();
        for (LottoTicketEntity t : ticketRepository.findAllWithUser()) {
            byUser.computeIfAbsent(t.getUser().getId(), k -> new ArrayList<>()).add(t);
        }

        List<LottoAlertEntity> alerts = new ArrayList<>();
        for (List<LottoTicketEntity> tickets : byUser.values()) {
            int best = 0;
            int wins = 0;
            for (LottoTicketEntity t : tickets) {
                int r = rankOf(t.numberList(), draw);
                if (r > 0) {
                    wins++;
                    best = best == 0 ? r : Math.min(best, r);
                }
            }
            alerts.add(LottoAlertEntity.builder().user(tickets.get(0).getUser()).drwNo(draw.getDrwNo())
                    .bestRank(best).winCount(wins).ticketCount(tickets.size()).build());
        }
        alertRepository.saveAll(alerts);
        log.info("로또 {}회 결과 알림 {}건 생성", draw.getDrwNo(), alerts.size());
        sendMails(draw, alerts);
    }

    private void sendMails(LottoEntity draw, List<LottoAlertEntity> alerts) {
        if (!mailReady() || alerts.isEmpty()) return;
        JavaMailSender sender = mailSender.getIfAvailable();

        List<SimpleMailMessage> mails = new ArrayList<>();
        for (LottoAlertEntity a : alerts) {
            UserEntity user = a.getUser();
            boolean on = prefRepository.findById(user.getId()).map(LottoPrefEntity::getEmailOn).orElse(false);
            if (!on || user.getEmail() == null || user.getEmail().isBlank()) continue;
            SimpleMailMessage m = new SimpleMailMessage();
            m.setFrom(mailFrom);
            m.setTo(user.getEmail());
            m.setSubject(mailSubject(a));
            m.setText(mailBody(draw, a));
            mails.add(m);
        }
        if (mails.isEmpty()) return;
        // 메일 서버가 느려도 당첨번호 갱신을 막지 않도록 별도 스레드에서 발송
        Thread.ofVirtual().name("lotto-mail").start(() -> {
            for (SimpleMailMessage m : mails) {
                try {
                    sender.send(m);
                } catch (Exception e) {
                    log.warn("로또 알림 메일 발송 실패: {}", e.getMessage());
                }
            }
            log.info("로또 알림 메일 {}건 처리", mails.size());
        });
    }

    private static String mailSubject(LottoAlertEntity a) {
        return a.getBestRank() > 0
                ? String.format("[TerminalNexus] 로또 %d회 결과: 최고 %d등!", a.getDrwNo(), a.getBestRank())
                : String.format("[TerminalNexus] 로또 %d회 결과가 나왔어요", a.getDrwNo());
    }

    private static String mailBody(LottoEntity draw, LottoAlertEntity a) {
        String nums = draw.numbers().stream().map(String::valueOf).collect(Collectors.joining(", "));
        String result = a.getBestRank() > 0
                ? String.format("저장한 번호 %d개 중 %d개가 당첨권이에요. 최고 등수는 %d등입니다.", a.getTicketCount(), a.getWinCount(), a.getBestRank())
                : String.format("저장한 번호 %d개 중 당첨된 번호가 없어요.", a.getTicketCount());
        return String.format("""
                로또 %d회 (%s) 당첨번호
                %s + 보너스 %d

                %s

                자세히 보기: https://tnhub.kr/lotto?tab=my
                * 공식 당첨 여부는 동행복권에서 꼭 확인해 주세요.
                * 메일을 그만 받으려면 위 페이지에서 메일 알림을 꺼 주세요.
                """, draw.getDrwNo(), draw.getDrwNoDate(), nums, draw.getBnusNo(), result);
    }
}
