package kr.pe.tn.domain.donation.repository;

import kr.pe.tn.domain.donation.entity.Donation;
import kr.pe.tn.domain.donation.entity.DonationStatus;
import kr.pe.tn.domain.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DonationRepository extends JpaRepository<Donation, Long> {

    /** merchantUid로 결제 조회 (검증 시 사용) */
    Optional<Donation> findByMerchantUid(String merchantUid);

    /** 특정 유저의 후원 내역 (최신순) */
    List<Donation> findByUserOrderByCreatedDateDesc(UserEntity user);

    /** PAID 상태인 전체 후원 내역 (최신순) - 후원 현황 공개용 */
    List<Donation> findByStatusOrderByPaidDateDesc(DonationStatus status);
}
