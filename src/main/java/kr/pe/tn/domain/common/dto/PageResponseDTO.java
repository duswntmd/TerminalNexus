package kr.pe.tn.domain.common.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Data
public class PageResponseDTO<E> {

    private List<E> dtoList;

    private int totalPage;

    private int page;

    private int size;

    private int start, end;

    private boolean prev, next;

    private List<Integer> pageList;

    @Builder(builderMethodName = "withAll")
    public PageResponseDTO(List<E> dtoList, int total, PageRequestDTO pageRequestDTO) {

        this.dtoList = dtoList;
        this.page = pageRequestDTO.getPage();
        this.size = pageRequestDTO.getSize();

        this.end = (int) (Math.ceil(this.page / 10.0)) * 10;
        this.start = this.end - 9;

        int last = (int) (Math.ceil(total / (double) size));

        this.end = end > last ? last : end;

        this.prev = this.start > 1;
        this.next = total > this.end * this.size;

        this.pageList = IntStream.rangeClosed(this.start, this.end).boxed().collect(Collectors.toList());
        this.totalPage = last;
    }
}
