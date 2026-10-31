package kr.pe.tn.domain.cert.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.pe.tn.domain.cert.dto.CertDTO;
import kr.pe.tn.domain.cert.entity.CertAttemptEntity;
import kr.pe.tn.domain.cert.entity.CertAttemptEntity.Mode;
import kr.pe.tn.domain.cert.entity.CertAttemptEntity.Status;
import kr.pe.tn.domain.cert.entity.CertPassEntity;
import kr.pe.tn.domain.cert.entity.CertWrongEntity;
import kr.pe.tn.domain.cert.repository.CertAttemptRepository;
import kr.pe.tn.domain.cert.repository.CertPassRepository;
import kr.pe.tn.domain.cert.repository.CertWrongRepository;
import kr.pe.tn.domain.cert.service.CertBank.Question;
import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.entity.UserRoleType;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 리눅스 자격증 연습
 * - 무료: 과목별 연습(무료 문제), 미니 모의고사 1회
 * - 이용권: 전체 문제, 실전 모의고사, 오답노트
 * 모의고사 구성과 합격선은 이 사이트의 자체 기준이다.
 */
@Service
@RequiredArgsConstructor
public class CertService {

    public static final String EXAM_ID = "linuxmaster2";
    public static final int FULL_QUESTIONS = 50;
    public static final int FULL_MINUTES = 60;
    public static final int TRIAL_QUESTIONS = 20;
    public static final int TRIAL_MINUTES = 25;
    public static final int PASS_SCORE = 60;
    public static final int SUBJECT_MIN_SCORE = 40;

    public static final List<CertDTO.Plan> PLANS = List.of(
            new CertDTO.Plan("d30", "30일 이용권", 30, 9_900),
            new CertDTO.Plan("d90", "90일 이용권", 90, 19_900));

    private final CertBank bank;
    private final CertAttemptRepository attemptRepository;
    private final CertWrongRepository wrongRepository;
    private final CertPassRepository passRepository;
    private final ObjectMapper objectMapper;

    @Value("${cert.payment.enabled:false}")
    private boolean paymentEnabled;

    public boolean hasPass(UserEntity user) {
        if (user == null) return false;
        if (user.getRoleType() == UserRoleType.ADMIN) return true;
        return passRepository.findById(user.getId())
                .map(p -> p.getExpiresAt().isAfter(LocalDateTime.now()))
                .orElse(false);
    }

    private static CertDTO.QuestionView view(Question q) {
        return new CertDTO.QuestionView(q.id(), q.subject(), q.text(), q.choices());
    }

    public CertDTO.ExamInfo examInfo() {
        Map<String, Long> total = bank.count(false);
        Map<String, Long> free = bank.count(true);
        List<CertDTO.SubjectInfo> subjects = CertBank.SUBJECT_ORDER.stream()
                .map(s -> new CertDTO.SubjectInfo(s, CertBank.SUBJECTS.get(s), total.get(s), free.get(s)))
                .toList();
        return new CertDTO.ExamInfo(EXAM_ID, "리눅스마스터 2급 대비", subjects, FULL_QUESTIONS, FULL_MINUTES,
                TRIAL_QUESTIONS, TRIAL_MINUTES, PASS_SCORE, SUBJECT_MIN_SCORE, PLANS, paymentEnabled);
    }

    /* ───────── 과목별 연습 ───────── */

    @Transactional(readOnly = true)
    public CertDTO.PracticeResponse practice(UserEntity user, String subject, int count) {
        if (subject != null && !CertBank.SUBJECTS.containsKey(subject)) {
            throw new IllegalArgumentException("없는 과목입니다.");
        }
        boolean freeOnly = !hasPass(user);
        List<Question> pool = new ArrayList<>(bank.pool(subject, freeOnly));
        Collections.shuffle(pool);
        int n = Math.min(Math.max(5, Math.min(count, 30)), pool.size());
        long locked = freeOnly ? bank.pool(subject, false).size() - pool.size() : 0;
        return new CertDTO.PracticeResponse(pool.subList(0, n).stream().map(CertService::view).toList(), locked);
    }

    /** 한 문제 채점. 로그인 상태면 오답을 기록하고, 맞히면 오답노트에서 뺌 */
    @Transactional
    public CertDTO.CheckResponse check(UserEntity user, CertDTO.CheckRequest req) {
        Question q = req.questionId() == null ? null : bank.get(req.questionId());
        if (q == null || req.choice() == null) {
            throw new IllegalArgumentException("문제를 찾을 수 없습니다.");
        }
        if (!q.free() && !hasPass(user)) {
            throw new IllegalStateException("이용권이 필요한 문제입니다.");
        }
        boolean correct = q.answer() == req.choice();
        if (user != null) recordResult(user, q.id(), correct);
        return new CertDTO.CheckResponse(correct, q.answer(), q.explain());
    }

    private void recordResult(UserEntity user, String questionId, boolean correct) {
        CertWrongEntity wrong = wrongRepository.findByUserAndQuestionId(user, questionId).orElse(null);
        if (correct) {
            if (wrong != null) wrong.resolve();
        } else if (wrong == null) {
            wrongRepository.save(new CertWrongEntity(user, questionId));
        } else {
            wrong.again();
        }
    }

    @Transactional(readOnly = true)
    public CertDTO.WrongNote wrongNote(UserEntity user) {
        List<CertWrongEntity> list = wrongRepository.findByUserAndResolvedFalseOrderByLastWrongAtDesc(user);
        if (!hasPass(user)) {
            return new CertDTO.WrongNote(list.size(), true, List.of());
        }
        List<CertDTO.QuestionView> questions = list.stream()
                .map(w -> bank.get(w.getQuestionId())).filter(q -> q != null).map(CertService::view).toList();
        return new CertDTO.WrongNote(list.size(), false, questions);
    }

    /* ───────── 모의고사 ───────── */

    /** 과목별로 나눠 무작위 출제 */
    private List<Question> draw(int total, boolean freeOnly) {
        List<String> subjects = CertBank.SUBJECT_ORDER;
        List<Question> out = new ArrayList<>();
        for (int i = 0; i < subjects.size(); i++) {
            int n = total / subjects.size() + (i < total % subjects.size() ? 1 : 0);
            List<Question> pool = new ArrayList<>(bank.pool(subjects.get(i), freeOnly));
            Collections.shuffle(pool);
            out.addAll(pool.subList(0, Math.min(n, pool.size())));
        }
        return out;
    }

    private CertAttemptEntity currentAttempt(UserEntity user) {
        return attemptRepository.findFirstByUserAndStatusOrderByIdDesc(user, Status.IN_PROGRESS).orElse(null);
    }

    private CertDTO.AttemptView attemptView(CertAttemptEntity a) {
        List<CertDTO.QuestionView> questions = Arrays.stream(a.getQuestionIds().split(","))
                .map(bank::get).map(CertService::view).toList();
        long remaining = Math.max(0, Duration.between(LocalDateTime.now(), a.getEndsAt()).getSeconds());
        return new CertDTO.AttemptView(a.getId(), a.getMode().name(), questions, remaining);
    }

    /** 이용권이 있으면 실전, 없으면 미니 모의고사 1회. 진행 중인 시험이 있으면 그것을 이어서 */
    @Transactional
    public CertDTO.AttemptView start(UserEntity user) {
        CertAttemptEntity current = currentAttempt(user);
        if (current != null) return attemptView(current);

        boolean pass = hasPass(user);
        if (!pass && attemptRepository.existsByUserAndMode(user, Mode.TRIAL)) {
            throw new IllegalStateException("무료 모의고사를 이미 응시했어요. 이용권이 있으면 계속 응시할 수 있습니다.");
        }
        int count = pass ? FULL_QUESTIONS : TRIAL_QUESTIONS;
        int minutes = pass ? FULL_MINUTES : TRIAL_MINUTES;
        String ids = draw(count, !pass).stream().map(Question::id).collect(Collectors.joining(","));
        CertAttemptEntity attempt = attemptRepository.save(CertAttemptEntity.builder()
                .user(user).mode(pass ? Mode.FULL : Mode.TRIAL).questionIds(ids)
                .endsAt(LocalDateTime.now().plusMinutes(minutes)).build());
        return attemptView(attempt);
    }

    @Transactional(readOnly = true)
    public CertDTO.AttemptView current(UserEntity user) {
        CertAttemptEntity a = currentAttempt(user);
        return a == null ? null : attemptView(a);
    }

    private CertAttemptEntity own(UserEntity user, CertAttemptEntity a) {
        if (!a.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("시험을 찾을 수 없습니다.");
        }
        return a;
    }

    @Transactional
    public CertDTO.ResultView submit(UserEntity user, Long id, CertDTO.SubmitRequest req) {
        CertAttemptEntity a = own(user, attemptRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new IllegalArgumentException("시험을 찾을 수 없습니다.")));
        if (a.getStatus() != Status.IN_PROGRESS) {
            throw new IllegalStateException("이미 제출한 시험입니다.");
        }
        Map<String, Integer> answers = req.answers() == null ? Map.of() : req.answers();
        List<Question> questions = Arrays.stream(a.getQuestionIds().split(",")).map(bank::get).toList();

        // 출제된 문제의 답만 저장
        Map<String, Integer> kept = new LinkedHashMap<>();
        for (Question q : questions) {
            if (answers.containsKey(q.id())) kept.put(q.id(), answers.get(q.id()));
        }
        int correct = 0;
        for (Question q : questions) {
            boolean ok = Integer.valueOf(q.answer()).equals(kept.get(q.id()));
            if (ok) correct++;
            recordResult(user, q.id(), ok);
        }
        List<CertDTO.SubjectScore> subjects = subjectScores(questions, kept);
        int score = Math.round(correct * 100f / questions.size());
        boolean passed = score >= PASS_SCORE && subjects.stream().allMatch(s -> s.score() >= SUBJECT_MIN_SCORE);
        a.finish(toJson(kept), score, correct, passed);
        return resultView(a, questions, kept, subjects);
    }

    @Transactional(readOnly = true)
    public CertDTO.ResultView result(UserEntity user, Long id) {
        CertAttemptEntity a = own(user, attemptRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("시험을 찾을 수 없습니다.")));
        if (a.getStatus() != Status.DONE) {
            throw new IllegalStateException("아직 제출하지 않은 시험입니다.");
        }
        List<Question> questions = Arrays.stream(a.getQuestionIds().split(",")).map(bank::get).toList();
        Map<String, Integer> answers = fromJson(a.getAnswers());
        return resultView(a, questions, answers, subjectScores(questions, answers));
    }

    private static List<CertDTO.SubjectScore> subjectScores(List<Question> questions, Map<String, Integer> answers) {
        List<CertDTO.SubjectScore> out = new ArrayList<>();
        for (String s : CertBank.SUBJECT_ORDER) {
            List<Question> part = questions.stream().filter(q -> q.subject().equals(s)).toList();
            if (part.isEmpty()) continue;
            int ok = (int) part.stream().filter(q -> Integer.valueOf(q.answer()).equals(answers.get(q.id()))).count();
            out.add(new CertDTO.SubjectScore(s, ok, part.size(), Math.round(ok * 100f / part.size())));
        }
        return out;
    }

    private static CertDTO.ResultView resultView(CertAttemptEntity a, List<Question> questions, Map<String, Integer> answers,
                                                 List<CertDTO.SubjectScore> subjects) {
        List<CertDTO.ReviewItem> review = questions.stream()
                .map(q -> new CertDTO.ReviewItem(view(q), answers.get(q.id()), q.answer(), q.explain())).toList();
        return new CertDTO.ResultView(a.getId(), a.getMode().name(), a.getScore(), a.getCorrect(), questions.size(),
                a.getPassed(), subjects, review);
    }

    private String toJson(Map<String, Integer> m) {
        try {
            return objectMapper.writeValueAsString(m);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("답안을 저장하지 못했습니다.", e);
        }
    }

    private Map<String, Integer> fromJson(String s) {
        try {
            return objectMapper.readValue(s, new TypeReference<>() { });
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }

    @Transactional(readOnly = true)
    public CertDTO.Me me(UserEntity user) {
        CertAttemptEntity cur = currentAttempt(user);
        List<CertDTO.HistoryItem> history = attemptRepository.findTop10ByUserAndStatusOrderByIdDesc(user, Status.DONE).stream()
                .map(a -> new CertDTO.HistoryItem(a.getId(), a.getMode().name(), a.getScore(), a.getCorrect(), a.getPassed(),
                        a.getSubmittedAt().toString()))
                .toList();
        String expires = passRepository.findById(user.getId()).map(CertPassEntity::getExpiresAt)
                .filter(t -> t.isAfter(LocalDateTime.now())).map(LocalDateTime::toString).orElse(null);
        return new CertDTO.Me(hasPass(user), expires, attemptRepository.existsByUserAndMode(user, Mode.TRIAL),
                wrongRepository.countByUserAndResolvedFalse(user), cur == null ? null : cur.getId(), history);
    }
}
