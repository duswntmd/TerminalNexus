package kr.pe.tn.domain.typeracer.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TypeRacerRequestDTO {

    @NotNull(message = "타수(WPM)는 필수 입력 값입니다.")
    @Min(value = 0, message = "타수(WPM)는 0 이상이어야 합니다.")
    private Integer wpm;

    @NotNull(message = "정확도는 필수 입력 값입니다.")
    @Min(value = 0, message = "정확도는 0% 이상이어야 합니다.")
    @Max(value = 100, message = "정확도는 100% 이하여야 합니다.")
    private Double accuracy;
}
