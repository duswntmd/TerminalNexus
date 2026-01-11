package kr.pe.tn.api;

import jakarta.servlet.http.HttpSession;
import kr.pe.tn.domain.common.dto.PageRequestDTO;
import kr.pe.tn.domain.common.dto.PageResponseDTO;
import kr.pe.tn.domain.freeboard.dto.FreeBoardDTO;
import kr.pe.tn.domain.freeboard.service.FreeBoardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/freeboard")
@RequiredArgsConstructor
public class FreeBoardController {

    private final FreeBoardService freeBoardService;

    @PostMapping
    public ResponseEntity<Map<String, Long>> register(@RequestBody FreeBoardDTO.Request requestDTO) {
        Long id = freeBoardService.register(requestDTO);
        return ResponseEntity.status(201).body(Collections.singletonMap("id", id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FreeBoardDTO.Response> read(@PathVariable("id") Long id, HttpSession session) {
        return ResponseEntity.ok(freeBoardService.read(id, session));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Long> modify(@PathVariable("id") Long id, @RequestBody FreeBoardDTO.Request requestDTO) {
        return ResponseEntity.ok(freeBoardService.modify(id, requestDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> remove(@PathVariable("id") Long id) {
        freeBoardService.remove(id);
        return ResponseEntity.ok(Collections.singletonMap("message", "Deleted successfully"));
    }

    @GetMapping
    public ResponseEntity<PageResponseDTO<FreeBoardDTO.Response>> list(PageRequestDTO pageRequestDTO) {
        return ResponseEntity.ok(freeBoardService.list(pageRequestDTO));
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<Map<String, Boolean>> toggleLike(@PathVariable("id") Long id) {
        boolean isLiked = freeBoardService.toggleLike(id);
        return ResponseEntity.ok(Collections.singletonMap("isLiked", isLiked));
    }

    @PostMapping("/{id}/dislike")
    public ResponseEntity<Map<String, Boolean>> toggleDislike(@PathVariable("id") Long id) {
        boolean isDisliked = freeBoardService.toggleDislike(id);
        return ResponseEntity.ok(Collections.singletonMap("isDisliked", isDisliked));
    }

}
