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

    public static <E> PageResponseDTOBuilder<E> withAll() {
        return new PageResponseDTOBuilder<E>();
    }

    public static class PageResponseDTOBuilder<E> {
        private List<E> dtoList;
        private int total;
        private PageRequestDTO pageRequestDTO;

        public PageResponseDTOBuilder<E> dtoList(List<E> dtoList) { this.dtoList = dtoList; return this; }
        public PageResponseDTOBuilder<E> total(int total) { this.total = total; return this; }
        public PageResponseDTOBuilder<E> pageRequestDTO(PageRequestDTO pageRequestDTO) { this.pageRequestDTO = pageRequestDTO; return this; }

        public PageResponseDTO<E> build() {
            return new PageResponseDTO<E>(dtoList, total, pageRequestDTO);
        }
    }

    public List<E> getDtoList() { return dtoList; }
    public void setDtoList(List<E> dtoList) { this.dtoList = dtoList; }
    public int getTotalPage() { return totalPage; }
    public void setTotalPage(int totalPage) { this.totalPage = totalPage; }
    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }
    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }
    public int getStart() { return start; }
    public int getEnd() { return end; }
    public boolean isPrev() { return prev; }
    public boolean isNext() { return next; }
    public List<Integer> getPageList() { return pageList; }
}
