package kr.pe.tn.domain.freeboard.service;

import kr.pe.tn.domain.common.dto.PageRequestDTO;
import kr.pe.tn.domain.common.dto.PageResponseDTO;
import kr.pe.tn.domain.freeboard.dto.FreeBoardDTO;
import kr.pe.tn.domain.freeboard.dto.UploadResultDTO;
import kr.pe.tn.domain.freeboard.entity.FreeBoard;
import kr.pe.tn.domain.freeboard.repository.FreeBoardDislikeRepository;
import kr.pe.tn.domain.freeboard.repository.FreeBoardLikeRepository;
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class FreeBoardService {

    @Value("${org.zerock.upload.path}")
    private String uploadPath;

    private final FreeBoardRepository freeBoardRepository;
    private final UserRepository userRepository;
    private final FreeBoardLikeRepository freeBoardLikeRepository;
    private final FreeBoardDislikeRepository freeBoardDislikeRepository;

    // 등록
    public Long register(FreeBoardDTO.Request requestDTO) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserEntity user = userRepository.findByUsernameAndIsLockAndIsSocial(username, false, false)
                .or(() -> userRepository.findByUsernameAndIsLock(username, false))
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
                        .youtubeUrl(fileDTO.getYoutubeUrl())
                        .freeBoard(freeBoard)
                        .build();
                freeBoard.addFile(boardFile);
            });
        }

        return freeBoardRepository.save(freeBoard).getId();
    }

    // 조회
    // 사실 조회수 증가 때문에 Transactional 필요함
    @Transactional
    public FreeBoardDTO.Response read(Long id, jakarta.servlet.http.HttpSession session) {
        FreeBoard freeBoard = freeBoardRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Board not found"));

        // 조회수 증가 (세션 기반 중복 방지)
        String viewedKey = "viewed_board_" + id;
        if (session.getAttribute(viewedKey) == null) {
            freeBoard.increaseViewCount();
            session.setAttribute(viewedKey, true);
            // 세션 유지 시간: 30분 (초 단위)
            session.setMaxInactiveInterval(1800);
        }

        FreeBoardDTO.Response response = FreeBoardDTO.Response.from(freeBoard);

        // Check Like & Dislike & 권한 체크
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!username.equals("anonymousUser")) {
            UserEntity user = userRepository.findByUsernameAndIsLock(username, false).orElse(null);
            if (user != null) {
                response.setLiked(freeBoardLikeRepository.existsByUserAndFreeBoard(user, freeBoard));
                response.setDisliked(freeBoardDislikeRepository.existsByUserAndFreeBoard(user, freeBoard));

                // 권한 체크: 작성자이거나 관리자인 경우
                boolean isWriter = freeBoard.getUser().getUsername().equals(username);
                boolean isAdmin = user.getRoleType() == kr.pe.tn.domain.user.entity.UserRoleType.ADMIN;

                response.setCanEdit(isWriter || isAdmin);
                response.setCanDelete(isWriter || isAdmin);
            }
        }

        return response;
    }

    // 수정
    @Transactional
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

        // 삭제할 파일 처리
        if (requestDTO.getDeletedFileIds() != null && !requestDTO.getDeletedFileIds().isEmpty()) {
            freeBoard.getFiles().removeIf(file -> requestDTO.getDeletedFileIds().contains(file.getUuid()));
        }

        // 새로운 파일 추가
        if (requestDTO.getFileDTOs() != null) {
            requestDTO.getFileDTOs().forEach(fileDTO -> {
                kr.pe.tn.domain.freeboard.entity.FreeBoardFile boardFile = kr.pe.tn.domain.freeboard.entity.FreeBoardFile
                        .builder()
                        .uuid(fileDTO.getUuid())
                        .originalName(fileDTO.getFileName())
                        .path(fileDTO.getFolderPath())
                        .type(fileDTO.getType())
                        .youtubeUrl(fileDTO.getYoutubeUrl())
                        .freeBoard(freeBoard)
                        .build();
                freeBoard.addFile(boardFile);
            });
        }

        // modDate 수동 업데이트
        freeBoard.updateModifiedDate();

        // 명시적 save()로 DB 반영
        FreeBoard saved = freeBoardRepository.save(freeBoard);

        return saved.getId();
    }

    // 삭제 (Hard Delete - 댓글/파일/좋아요 모두 cascade 삭제)
    @Transactional
    public void remove(Long id) {
        FreeBoard freeBoard = freeBoardRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("게시글을 찾을 수 없습니다."));

        // 본인 확인
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!freeBoard.getUser().getUsername().equals(username)) {
            throw new AccessDeniedException("작성자만 삭제할 수 있습니다.");
        }

        // Hard Delete: cascade로 인해 댓글, 파일, 좋아요, 싫어요 모두 자동 삭제
        // 파일의 경우 물리적 파일도 삭제 필요
        if (freeBoard.getFiles() != null && !freeBoard.getFiles().isEmpty()) {
            freeBoard.getFiles().forEach(file -> {
                try {
                    String folderPath = file.getPath();
                    String uuid = file.getUuid();
                    String fileName = file.getOriginalName();

                    Path filePath = Paths.get(uploadPath, folderPath, uuid + "_" + fileName);
                    File targetFile = filePath.toFile();

                    if (targetFile.exists()) {
                        targetFile.delete();
                        log.info("Deleted file: " + targetFile.getAbsolutePath());
                    }

                    // 썸네일이 있다면 삭제 (Optional)
                    Path thumbnailPath = Paths.get(uploadPath, folderPath, "s_" + uuid + "_" + fileName);
                    File thumbnailFile = thumbnailPath.toFile();
                    if (thumbnailFile.exists()) {
                        thumbnailFile.delete();
                    }

                } catch (Exception e) {
                    log.error("Failed to delete file: " + file.getOriginalName(), e);
                }
            });
        }

        freeBoardRepository.delete(freeBoard);
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

    // 좋아요 토글
    public boolean toggleLike(Long boardId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserEntity user = userRepository.findByUsernameAndIsLock(username, false)
                .orElseThrow(() -> new NoSuchElementException("User not found or locked"));

        FreeBoard freeBoard = freeBoardRepository.findById(boardId)
                .orElseThrow(() -> new NoSuchElementException("Board not found"));

        if (freeBoardLikeRepository.existsByUserAndFreeBoard(user, freeBoard)) {
            // Cancel Like
            kr.pe.tn.domain.freeboard.entity.FreeBoardLike like = freeBoardLikeRepository
                    .findByUserAndFreeBoard(user, freeBoard)
                    .orElseThrow();
            freeBoardLikeRepository.delete(like);
            freeBoard.updateLikeCount(-1);
            return false;
        } else {
            // Add Like
            kr.pe.tn.domain.freeboard.entity.FreeBoardLike like = kr.pe.tn.domain.freeboard.entity.FreeBoardLike
                    .builder()
                    .user(user)
                    .freeBoard(freeBoard)
                    .build();
            freeBoardLikeRepository.save(like);
            freeBoard.updateLikeCount(1);
            return true;
        }
    }

    // 싫어요 토글
    public boolean toggleDislike(Long boardId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserEntity user = userRepository.findByUsernameAndIsLock(username, false)
                .orElseThrow(() -> new NoSuchElementException("User not found or locked"));

        FreeBoard freeBoard = freeBoardRepository.findById(boardId)
                .orElseThrow(() -> new NoSuchElementException("Board not found"));

        if (freeBoardDislikeRepository.existsByUserAndFreeBoard(user, freeBoard)) {
            // Cancel Dislike
            kr.pe.tn.domain.freeboard.entity.FreeBoardDislike dislike = freeBoardDislikeRepository
                    .findByUserAndFreeBoard(user, freeBoard)
                    .orElseThrow();
            freeBoardDislikeRepository.delete(dislike);
            freeBoard.updateDislikeCount(-1);
            return false;
        } else {
            // Add Dislike
            kr.pe.tn.domain.freeboard.entity.FreeBoardDislike dislike = kr.pe.tn.domain.freeboard.entity.FreeBoardDislike
                    .builder()
                    .user(user)
                    .freeBoard(freeBoard)
                    .build();
            freeBoardDislikeRepository.save(dislike);
            freeBoard.updateDislikeCount(1);
            return true;
        }
    }
}
