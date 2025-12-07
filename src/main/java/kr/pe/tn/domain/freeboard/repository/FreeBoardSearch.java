package kr.pe.tn.domain.freeboard.repository;

import kr.pe.tn.domain.freeboard.entity.FreeBoard;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface FreeBoardSearch {

    Page<FreeBoard> search(Pageable pageable, String type, String keyword);

}
