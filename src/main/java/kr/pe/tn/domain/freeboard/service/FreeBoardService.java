package kr.pe.tn.domain.freeboard.service;

import kr.pe.tn.domain.common.dto.PageRequestDTO;
import kr.pe.tn.domain.common.dto.PageResponseDTO;
import kr.pe.tn.domain.freeboard.dto.FreeBoardDTO;
import kr.pe.tn.domain.freeboard.entity.FreeBoard;
import kr.pe.tn.domain.freeboard.repository.FreeBoardRepository;
import kr.pe.tn.domain.user.entity.UserEntity;
import kr.pe.tn.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class FreeBoardService {

    private final FreeBoardRepository freeBoardRepository;
    private final UserRepository userRepository;

    // 등록
    public Long register(FreeBoardDTO.Request requestDTO) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserEntity user = userRepository.findByUsernameAndIsLockAndIsSocial(username, false, false) // Social handled?
                                                                                                    // checkUserService
                                                                                                    // logic.
                .or(() -> userRepository.findByUsernameAndIsLock(username, false)) // Allow all active users
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        FreeBoard freeBoard = FreeBoard.builder()
                .title(requestDTO.getTitle())
                .content(requestDTO.getContent())
                .user(user)
                .build();

        if (requestDTO.getFileDTOs() != null) {
            requestDTO.getFileDTOs().forEach(fileDTO -> {
                kr.pe.tn.domain.freeboard.entity.FreeBoardFile boardFile = kr.pe.tn.domain.freeboard.entity.FreeBoardFile
                        .builder()
                        .uuid(fileDTO.getUuid())
                        .originalName(fileDTO.getFileName())
                        .path(fileDTO.getFolderPath())
                        .type(fileDTO.getType())
                        .freeBoard(freeBoard)
                        .build();
                freeBoard.addFile(boardFile);
            });
        }

        return freeBoardRepository.save(freeBoard).getId();
    }

    // 조회
    public FreeBoardDTO.Response read(Long id) {
        FreeBoard freeBoard = freeBoardRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Board not found"));

        // 조회수 증가
        freeBoard.increaseViewCount();

        return FreeBoardDTO.Response.from(freeBoard);
    }

    // 수정
    public Long modify(Long id, FreeBoardDTO.Request requestDTO) {
        FreeBoard freeBoard = freeBoardRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Board not found"));

        // 본인 확인
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!freeBoard.getUser().getUsername().equals(username)) {
            throw new AccessDeniedException("Only the writer can modify.");
        }

        freeBoard.changeTitle(requestDTO.getTitle());
        freeBoard.changeContent(requestDTO.getContent());

        return freeBoard.getId();
    }

    // 삭제 (Soft Delete)
    public void remove(Long id) {
        FreeBoard freeBoard = freeBoardRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Board not found"));

        // 본인 확인 (Admin check logic could be added)
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!freeBoard.getUser().getUsername().equals(username)) {
            throw new AccessDeniedException("Only the writer can delete.");
        }

        freeBoard.changeIsDeleted(true);
    }

    // 목록
    @Transactional(readOnly = true)
    public PageResponseDTO<FreeBoardDTO.Response> list(PageRequestDTO pageRequestDTO) {
        Pageable pageable = pageRequestDTO.getPageable("id");

        Page<FreeBoard> result = freeBoardRepository.search(pageable, pageRequestDTO.getType(),
                pageRequestDTO.getKeyword());

        List<FreeBoardDTO.Response> dtoList = result.getContent().stream()
                .map(FreeBoardDTO.Response::from)
                .collect(Collectors.toList());

        return PageResponseDTO.<FreeBoardDTO.Response>withAll()
                .dtoList(dtoList)
                .total((int) result.getTotalElements())
                .pageRequestDTO(pageRequestDTO)
                .build();
    }
}
