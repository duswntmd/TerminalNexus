package kr.pe.tn.domain.fruit.service;

import kr.pe.tn.domain.fruit.entity.Fruit;
import kr.pe.tn.domain.fruit.repository.FruitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * 애플리케이션 시작 시 과일 초기 데이터를 자동으로 추가
 * RAG 시스템 테스트를 위한 샘플 데이터 제공
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FruitDataInitializer implements CommandLineRunner {

    private final FruitRepository fruitRepository;

    @Override
    public void run(String... args) {
        // 이미 데이터가 있으면 초기화하지 않음
        if (fruitRepository.count() > 0) {
            log.info("과일 데이터가 이미 존재합니다. 초기화를 건너뜁니다.");
            return;
        }

        log.info("과일 초기 데이터를 추가합니다...");

        // 사과
        fruitRepository.save(Fruit.builder()
                .name("사과")
                .englishName("Apple")
                .benefits("항산화 효과, 심혈관 건강 개선, 소화 촉진, 면역력 강화")
                .nutrients("비타민C, 식이섬유, 칼륨, 폴리페놀")
                .description(
                        "사과는 '하루에 사과 한 개면 의사가 필요 없다'는 말이 있을 정도로 건강에 좋은 과일입니다. 펙틴 성분이 풍부하여 장 건강에 도움을 주고, 폴리페놀 성분은 강력한 항산화 작용을 합니다.")
                .season("가을 (9월~11월)")
                .origin("중앙아시아")
                .build());

        // 바나나
        fruitRepository.save(Fruit.builder()
                .name("바나나")
                .englishName("Banana")
                .benefits("에너지 공급, 근육 경련 예방, 소화 개선, 기분 개선")
                .nutrients("칼륨, 비타민B6, 비타민C, 마그네슘, 트립토판")
                .description(
                        "바나나는 운동선수들이 즐겨 먹는 과일로, 빠른 에너지 공급과 함께 칼륨이 풍부하여 근육 경련을 예방합니다. 트립토판 성분은 세로토닌 생성을 도와 기분을 좋게 합니다.")
                .season("연중 (열대 과일)")
                .origin("동남아시아")
                .build());

        // 오렌지
        fruitRepository.save(Fruit.builder()
                .name("오렌지")
                .englishName("Orange")
                .benefits("면역력 강화, 피부 건강, 항산화 효과, 감기 예방")
                .nutrients("비타민C, 비타민A, 엽산, 칼륨, 식이섬유")
                .description("오렌지는 비타민C의 대표 과일로, 하루 권장량의 100% 이상을 제공합니다. 강력한 항산화 작용으로 면역력을 높이고 피부를 건강하게 유지합니다.")
                .season("겨울 (12월~2월)")
                .origin("중국 남부")
                .build());

        // 딸기
        fruitRepository.save(Fruit.builder()
                .name("딸기")
                .englishName("Strawberry")
                .benefits("항산화 효과, 심혈관 건강, 혈당 조절, 피부 미용")
                .nutrients("비타민C, 망간, 엽산, 안토시아닌")
                .description("딸기는 비타민C가 매우 풍부하며, 안토시아닌 성분이 심혈관 건강에 도움을 줍니다. 낮은 칼로리와 높은 영양가로 다이어트에도 좋습니다.")
                .season("봄 (3월~5월)")
                .origin("유럽")
                .build());

        // 키위
        fruitRepository.save(Fruit.builder()
                .name("키위")
                .englishName("Kiwi")
                .benefits("소화 촉진, 면역력 강화, 피부 건강, 수면 개선")
                .nutrients("비타민C, 비타민K, 비타민E, 식이섬유, 액티니딘")
                .description("키위는 비타민C 함량이 오렌지보다 높으며, 액티니딘 효소가 단백질 소화를 돕습니다. 세로토닌 성분이 수면의 질을 개선하는 데 도움을 줍니다.")
                .season("가을~겨울 (10월~3월)")
                .origin("뉴질랜드")
                .build());

        // 블루베리
        fruitRepository.save(Fruit.builder()
                .name("블루베리")
                .englishName("Blueberry")
                .benefits("뇌 건강, 시력 보호, 항산화 효과, 노화 방지")
                .nutrients("안토시아닌, 비타민C, 비타민K, 망간")
                .description("블루베리는 '슈퍼푸드'로 불리며, 안토시아닌 함량이 매우 높아 강력한 항산화 작용을 합니다. 뇌 기능 개선과 시력 보호에 탁월한 효과가 있습니다.")
                .season("여름 (6월~8월)")
                .origin("북미")
                .build());

        // 수박
        fruitRepository.save(Fruit.builder()
                .name("수박")
                .englishName("Watermelon")
                .benefits("수분 보충, 항산화 효과, 근육통 완화, 혈압 조절")
                .nutrients("리코펜, 비타민C, 비타민A, 칼륨, 시트룰린")
                .description("수박은 92%가 수분으로 이루어져 여름철 수분 보충에 최고입니다. 리코펜과 시트룰린 성분이 심혈관 건강과 운동 후 근육 회복에 도움을 줍니다.")
                .season("여름 (6월~8월)")
                .origin("아프리카")
                .build());

        // 포도
        fruitRepository.save(Fruit.builder()
                .name("포도")
                .englishName("Grape")
                .benefits("심혈관 건강, 항산화 효과, 뇌 건강, 항염 효과")
                .nutrients("레스베라트롤, 비타민C, 비타민K, 칼륨")
                .description("포도는 레스베라트롤이라는 강력한 항산화 물질을 함유하고 있어 심장 건강과 노화 방지에 효과적입니다. 특히 적포도에 많이 함유되어 있습니다.")
                .season("가을 (8월~10월)")
                .origin("중동")
                .build());

        log.info("과일 초기 데이터 추가 완료: {} 개", fruitRepository.count());
    }
}
