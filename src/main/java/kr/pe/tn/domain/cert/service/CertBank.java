package kr.pe.tn.domain.cert.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * 문제은행 (서버 전용: 유료 문제가 프론트 번들에 들어가지 않도록 리소스로 관리)
 * - id: 과목-일련번호 (예: ops-012)
 * - 과목마다 앞에서 5문제 중 2문제를 무료 공개
 * - 정답 위치가 치우치지 않도록 문제별로 고정된 순서로 보기를 섞음
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CertBank {

    public static final Map<String, String> SUBJECTS = Map.of(
            "basic", "리눅스 일반",
            "ops", "리눅스 운영 및 관리",
            "apps", "리눅스 활용");
    public static final List<String> SUBJECT_ORDER = List.of("basic", "ops", "apps");

    public record Question(String id, String subject, String text, List<String> choices, int answer, String explain, boolean free) {
    }

    private final ObjectMapper objectMapper;
    private final Map<String, Question> byId = new LinkedHashMap<>();

    @PostConstruct
    void load() throws IOException {
        for (String subject : SUBJECT_ORDER) {
            try (InputStream in = new ClassPathResource("cert/linuxmaster2-" + subject + ".json").getInputStream()) {
                JsonNode list = objectMapper.readTree(in);
                int no = 0;
                for (JsonNode n : list) {
                    no++;
                    String id = String.format("%s-%03d", subject, no);
                    List<String> choices = new ArrayList<>();
                    n.path("c").forEach(c -> choices.add(c.asText()));
                    String correct = choices.get(n.path("a").asInt());
                    Collections.shuffle(choices, new Random(id.hashCode()));
                    byId.put(id, new Question(id, subject, n.path("q").asText(), List.copyOf(choices),
                            choices.indexOf(correct), n.path("e").asText(), (no - 1) % 5 < 2));
                }
            }
        }
        log.info("자격증 문제 {}개 로드 (무료 {}개)", byId.size(), byId.values().stream().filter(Question::free).count());
    }

    public Question get(String id) {
        return byId.get(id);
    }

    /** subject가 null이면 전체, freeOnly면 무료 문제만 */
    public List<Question> pool(String subject, boolean freeOnly) {
        return byId.values().stream()
                .filter(q -> subject == null || q.subject().equals(subject))
                .filter(q -> !freeOnly || q.free())
                .toList();
    }

    public Map<String, Long> count(boolean freeOnly) {
        Map<String, Long> out = new LinkedHashMap<>();
        for (String s : SUBJECT_ORDER) {
            out.put(s, (long) pool(s, freeOnly).size());
        }
        return out;
    }
}
