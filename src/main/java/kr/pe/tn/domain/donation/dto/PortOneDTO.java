package kr.pe.tn.domain.donation.dto;

import lombok.Getter;

/**
 * 포트원 서버 API 응답 역직렬화 DTO
 *
 * GET https://api.iamport.kr/payments/{imp_uid} 응답 구조
 */
public class PortOneDTO {

    /**
     * 포트원 액세스 토큰 발급 응답
     * POST https://api.iamport.kr/users/getToken
     */
    @Getter
    public static class TokenResponse {
        private int code;
        private String message;
        private TokenData response;

        @Getter
        public static class TokenData {
            private String access_token;
            private long now;
            private long expired_at;
        }
    }

    /**
     * 포트원 결제 정보 조회 응답
     * GET https://api.iamport.kr/payments/{imp_uid}
     */
    @Getter
    public static class PaymentResponse {
        private int code;
        private String message;
        private PaymentData response;

        @Getter
        public static class PaymentData {
            private String imp_uid; // 포트원 결제 고유번호
            private String merchant_uid; // 가맹점 주문번호
            private String pay_method; // 결제 수단 (card, kakaopay 등)
            private String pg_provider; // PG사 (html5_inicis, kakaopay 등)
            private String pg_tid; // PG사 결제 고유번호
            private int amount; // 결제 금액
            private String status; // 결제 상태 (paid, cancelled, failed)
            private String buyer_name; // 구매자 이름
            private String buyer_email; // 구매자 이메일
            private String currency; // 통화 (KRW)
            private String apply_num; // 카드 승인 번호
        }
    }
}
