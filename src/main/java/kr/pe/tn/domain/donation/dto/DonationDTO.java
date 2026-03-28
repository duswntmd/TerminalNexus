package kr.pe.tn.domain.donation.dto;

import kr.pe.tn.domain.donation.entity.Donation;
import kr.pe.tn.domain.donation.entity.DonationStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

public class DonationDTO {

    /**
     * 사전 결제 등록 요청 DTO (프론트 → 백엔드)
     * 포트원 SDK 호출 전, merchant_uid 와 금액을 DB에 먼저 저장 (위변조 방지)
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrepareRequest {
        private String merchantUid; // 프론트에서 생성한 주문번호 (donation_timestamp_random)
        private Integer amount; // 결제 요청 금액
        private String message; // 후원 메시지 (선택)
    }

    /**
     * 결제 검증 요청 DTO (프론트 → 백엔드)
     * 포트원 결제 완료 후 imp_uid 를 백엔드로 전달해 서버 검증
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyRequest {
        private String impUid; // 포트원 결제 고유번호
        private String merchantUid; // 가맹점 주문번호
    }

    /**
     * 후원 내역 응답 DTO (백엔드 → 프론트)
     */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String merchantUid;
        private Integer amount;
        private String payMethod;
        private String pgProvider;
        private DonationStatus status;
        private String message;
        private String donorNickname; // 후원자 닉네임
        private LocalDateTime createdDate;
        private LocalDateTime paidDate;

        public static Response from(Donation donation) {
            return Response.builder()
                    .id(donation.getId())
                    .merchantUid(donation.getMerchantUid())
                    .amount(donation.getAmount())
                    .payMethod(donation.getPayMethod())
                    .pgProvider(donation.getPgProvider())
                    .status(donation.getStatus())
                    .message(donation.getMessage())
                    .donorNickname(donation.getUser() != null
                            ? donation.getUser().getNickname()
                            : "익명")
                    .createdDate(donation.getCreatedDate())
                    .paidDate(donation.getPaidDate())
                    .build();
        }
    }
}
