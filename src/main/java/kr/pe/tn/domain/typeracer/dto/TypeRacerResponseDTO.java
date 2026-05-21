package kr.pe.tn.domain.typeracer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TypeRacerResponseDTO {

    private Integer rank;
    private String nickname;
    private Integer wpm;
    private Double accuracy;
    private LocalDateTime updatedDate;
}
