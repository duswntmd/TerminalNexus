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

    public Integer getRank() { return rank; }
    public String getNickname() { return nickname; }
    public Integer getWpm() { return wpm; }
    public Double getAccuracy() { return accuracy; }
    public LocalDateTime getUpdatedDate() { return updatedDate; }

    public static TypeRacerResponseDTOBuilder builder() { return new TypeRacerResponseDTOBuilder(); }

    public static class TypeRacerResponseDTOBuilder {
        private Integer rank;
        private String nickname;
        private Integer wpm;
        private Double accuracy;
        private LocalDateTime updatedDate;

        public TypeRacerResponseDTOBuilder rank(Integer rank) { this.rank = rank; return this; }
        public TypeRacerResponseDTOBuilder nickname(String nickname) { this.nickname = nickname; return this; }
        public TypeRacerResponseDTOBuilder wpm(Integer wpm) { this.wpm = wpm; return this; }
        public TypeRacerResponseDTOBuilder accuracy(Double accuracy) { this.accuracy = accuracy; return this; }
        public TypeRacerResponseDTOBuilder updatedDate(LocalDateTime updatedDate) { this.updatedDate = updatedDate; return this; }

        public TypeRacerResponseDTO build() {
            TypeRacerResponseDTO r = new TypeRacerResponseDTO();
            r.rank = this.rank;
            r.nickname = this.nickname;
            r.wpm = this.wpm;
            r.accuracy = this.accuracy;
            r.updatedDate = this.updatedDate;
            return r;
        }
    }
}
