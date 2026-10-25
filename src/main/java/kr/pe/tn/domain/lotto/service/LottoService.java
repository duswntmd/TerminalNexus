package kr.pe.tn.domain.lotto.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.pe.tn.domain.lotto.entity.LottoEntity;
import kr.pe.tn.domain.lotto.repository.LottoRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * 로또 6/45 당첨번호 수집·조회
 * - 서버 시작 시 동행복권에서 전 회차를 한 번에 받아 DB에 저장
 * - 매주 토요일 추첨(20:35) 이후 10분마다 새 회차를 확인해 자동 갱신
 * - 조회는 메모리 캐시에서 처리 (전체 약 1,200건)
 */
@Slf4j
@Service
public class LottoService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final LocalTime RESULT_READY = LocalTime.of(21, 0); // 추첨 후 결과가 올라오는 시각
    private static final DateTimeFormatter YMD = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final LottoRepository lottoRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate http;
    private final String apiUrl;

    /** 최신 회차가 앞에 오는 전체 목록 */
    private volatile List<LottoEntity> cache = List.of();

    public LottoService(LottoRepository lottoRepository, ObjectMapper objectMapper,
                        @Value("${lotto.api-url:https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do}") String apiUrl) {
        this.lottoRepository = lottoRepository;
        this.objectMapper = objectMapper;
        this.apiUrl = apiUrl;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(30_000);
        this.http = new RestTemplate(factory);
    }

    /** 서버 시작 시 백그라운드로 전체 동기화 (시작을 막지 않도록 별도 스레드) */
    @EventListener(ApplicationReadyEvent.class)
    public void initOnStartup() {
        reloadCache();
        Thread.ofVirtual().name("lotto-init").start(() -> {
            try {
                syncAll();
            } catch (Exception e) {
                log.warn("로또 전체 동기화 실패 (다음 확인 때 재시도): {}", e.getMessage());
            }
        });
    }

    /** 10분마다: 새 회차 발표 시각이 지났는데 아직 없으면 가져옴 */
    @Scheduled(cron = "0 */10 * * * *", zone = "Asia/Seoul")
    public void checkNewDraw() {
        try {
            if (cache.isEmpty()) {
                syncAll();
            } else if (isNextDrawDue()) {
                syncNew();
            }
        } catch (Exception e) {
            log.warn("로또 새 회차 확인 실패: {}", e.getMessage());
        }
    }

    boolean isNextDrawDue() {
        LottoEntity latest = cache.get(0);
        LocalDate next = LocalDate.parse(latest.getDrwNoDate()).plusDays(7);
        return !ZonedDateTime.now(KST).isBefore(next.atTime(RESULT_READY).atZone(KST));
    }

    /** 전 회차 수집 — DB가 비었거나 상세 정보가 빠진 예전 데이터가 있을 때만 저장 */
    synchronized void syncAll() {
        List<LottoEntity> remote = fetch("all");
        if (remote.isEmpty()) return;
        if (lottoRepository.countByFirstWinamntIsNotNull() < remote.size()) {
            lottoRepository.saveAll(remote);
            log.info("로또 당첨번호 {}회차 저장 완료 (최신 {}회)", remote.size(), remote.get(remote.size() - 1).getDrwNo());
        }
        reloadCache();
    }

    /** 최신 회차 이후 발표된 회차만 수집 */
    synchronized void syncNew() {
        long next = cache.isEmpty() ? 1 : cache.get(0).getDrwNo() + 1;
        boolean added = false;
        for (int i = 0; i < 10; i++, next++) {
            List<LottoEntity> found = fetch(String.valueOf(next));
            if (found.isEmpty()) break;
            lottoRepository.saveAll(found);
            log.info("로또 {}회 당첨번호 갱신", next);
            added = true;
        }
        if (added) reloadCache();
    }

    private void reloadCache() {
        List<LottoEntity> all = new ArrayList<>(lottoRepository.findAll());
        all.sort(Comparator.comparing(LottoEntity::getDrwNo).reversed());
        cache = List.copyOf(all);
    }

    private List<LottoEntity> fetch(String episode) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, "Mozilla/5.0 (compatible; tnhub.kr lotto sync)");
        headers.set("X-Requested-With", "XMLHttpRequest");
        String body = http.exchange(apiUrl + "?srchLtEpsd=" + episode, HttpMethod.GET,
                new HttpEntity<>(headers), String.class).getBody();
        try {
            JsonNode list = objectMapper.readTree(body).path("data").path("list");
            List<LottoEntity> result = new ArrayList<>();
            for (JsonNode n : list) {
                result.add(toEntity(n));
            }
            return result;
        } catch (Exception e) {
            throw new IllegalStateException("응답 형식이 바뀌었을 수 있음: " + e.getMessage(), e);
        }
    }

    private static LottoEntity toEntity(JsonNode n) {
        return LottoEntity.builder()
                .drwNo(n.path("ltEpsd").asLong())
                .drwNoDate(LocalDate.parse(n.path("ltRflYmd").asText(), YMD).toString())
                .drwtNo1(n.path("tm1WnNo").asInt())
                .drwtNo2(n.path("tm2WnNo").asInt())
                .drwtNo3(n.path("tm3WnNo").asInt())
                .drwtNo4(n.path("tm4WnNo").asInt())
                .drwtNo5(n.path("tm5WnNo").asInt())
                .drwtNo6(n.path("tm6WnNo").asInt())
                .bnusNo(n.path("bnsWnNo").asInt())
                .firstAccumamnt(n.path("rnk1SumWnAmt").asLong())
                .firstWinamnt(n.path("rnk1WnAmt").asLong())
                .firstPrzwnerCo(n.path("rnk1WnNope").asInt())
                .secondWinamnt(n.path("rnk2WnAmt").asLong())
                .secondPrzwnerCo(n.path("rnk2WnNope").asInt())
                .totSellamnt(n.path("wholEpsdSumNtslAmt").asLong())
                .build();
    }

    /* ───────── 조회 ───────── */

    /** 최신 회차가 앞에 오는 전체 목록 */
    public List<LottoEntity> getAll() {
        return cache;
    }

    public Optional<LottoEntity> getLatestLotto() {
        return cache.isEmpty() ? Optional.empty() : Optional.of(cache.get(0));
    }

    public Optional<LottoEntity> getLottoByDrwNo(long drwNo) {
        List<LottoEntity> all = cache;
        if (all.isEmpty()) return Optional.empty();
        int idx = (int) (all.get(0).getDrwNo() - drwNo); // 회차가 1씩 연속이라 인덱스로 바로 찾음
        if (idx >= 0 && idx < all.size() && all.get(idx).getDrwNo() == drwNo) {
            return Optional.of(all.get(idx));
        }
        return all.stream().filter(e -> e.getDrwNo() == drwNo).findFirst();
    }

    /** 다음 추첨 예정일 (최신 회차 + 7일) */
    public Optional<LocalDate> getNextDrawDate() {
        return getLatestLotto().map(l -> LocalDate.parse(l.getDrwNoDate()).plusDays(7));
    }
}
