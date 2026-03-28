package kr.pe.tn.domain.donation.entity;

public enum DonationStatus {
    READY, // 결제 준비 (사전 등록)
    PAID, // 결제 완료
    FAILED, // 결제 실패
    CANCELLED // 결제 취소
}
