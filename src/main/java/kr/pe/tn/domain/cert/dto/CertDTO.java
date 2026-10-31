package kr.pe.tn.domain.cert.dto;

import java.util.List;
import java.util.Map;

public class CertDTO {

    /** 정답·해설이 빠진 문제 */
    public record QuestionView(String id, String subject, String text, List<String> choices) {
    }

    public record Plan(String id, String name, int days, int amount) {
    }

    public record SubjectInfo(String id, String name, long total, long free) {
    }

    public record ExamInfo(String id, String name, List<SubjectInfo> subjects, int fullQuestions, int fullMinutes,
                           int trialQuestions, int trialMinutes, int passScore, int subjectMinScore,
                           List<Plan> plans, boolean paymentEnabled) {
    }

    public record PracticeResponse(List<QuestionView> questions, long locked) {
    }

    public record CheckRequest(String questionId, Integer choice) {
    }

    public record CheckResponse(boolean correct, int answer, String explain) {
    }

    public record AttemptView(long id, String mode, List<QuestionView> questions, long remainingSeconds) {
    }

    public record SubmitRequest(Map<String, Integer> answers) {
    }

    public record SubjectScore(String subject, int correct, int total, int score) {
    }

    public record ReviewItem(QuestionView question, Integer chosen, int answer, String explain) {
    }

    public record ResultView(long id, String mode, int score, int correct, int total, boolean passed,
                             List<SubjectScore> subjects, List<ReviewItem> review) {
    }

    public record HistoryItem(long id, String mode, int score, int correct, boolean passed, String submittedAt) {
    }

    public record Me(boolean hasPass, String passExpiresAt, boolean trialUsed, long wrongCount,
                     Long inProgressId, List<HistoryItem> history) {
    }

    public record WrongNote(long count, boolean locked, List<QuestionView> questions) {
    }

    public record OrderRequest(String planId) {
    }

    public record OrderResponse(String merchantUid, String name, int amount) {
    }

    public record VerifyRequest(String merchantUid) {
    }

    /** 포트원 웹훅 본문 */
    public record WebhookRequest(String imp_uid, String merchant_uid, String status) {
    }
}
