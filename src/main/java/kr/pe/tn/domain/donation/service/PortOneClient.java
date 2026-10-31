package kr.pe.tn.domain.donation.service;

import kr.pe.tn.domain.donation.dto.PortOneDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/** 포트원 서버 API 호출 (후원·이용권 결제 공용) */
@Component
@RequiredArgsConstructor
public class PortOneClient {

    private final RestTemplate restTemplate;

    @Value("${portone.imp_key}")
    private String impKey;

    @Value("${portone.imp_secret}")
    private String impSecret;

    @Value("${portone.api-url:https://api.iamport.kr}")
    private String apiUrl;

    /** 주문번호(merchant_uid)로 실제 결제 내역 조회 */
    public PortOneDTO.PaymentResponse.PaymentData findPayment(String merchantUid) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken());

        ResponseEntity<PortOneDTO.PaymentResponse> response = restTemplate.exchange(
                apiUrl + "/payments/find/" + merchantUid,
                HttpMethod.GET,
                new HttpEntity<Void>(headers),
                PortOneDTO.PaymentResponse.class);

        PortOneDTO.PaymentResponse body = response.getBody();
        if (body == null || body.getCode() != 0) {
            throw new RuntimeException("포트원에서 결제 정보를 조회할 수 없습니다.");
        }
        return body.getResponse();
    }

    private String accessToken() {
        Map<String, String> body = new HashMap<>();
        body.put("imp_key", impKey);
        body.put("imp_secret", impSecret);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<PortOneDTO.TokenResponse> response = restTemplate.postForEntity(
                apiUrl + "/users/getToken", new HttpEntity<>(body, headers), PortOneDTO.TokenResponse.class);

        PortOneDTO.TokenResponse token = response.getBody();
        if (token == null || token.getCode() != 0) {
            throw new RuntimeException("포트원 토큰 발급에 실패했습니다.");
        }
        return token.getResponse().getAccess_token();
    }
}
