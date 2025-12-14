package kr.pe.tn.api;

import kr.pe.tn.domain.freeboard.dto.UploadResultDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
public class UploadController {

    @Value("${org.zerock.upload.path}") // application.properties check needed
    private String uploadPath;

    @PostMapping("/uploadAjax")
    public ResponseEntity<List<UploadResultDTO>> uploadFile(MultipartFile[] uploadFiles) {

        List<UploadResultDTO> resultDTOList = new ArrayList<>();

        for (MultipartFile uploadFile : uploadFiles) {

            if (uploadFile.isEmpty()) {
                continue;
            }

            String originalName = uploadFile.getOriginalFilename();
            // NPE Check
            if (originalName == null || originalName.trim().isEmpty()) {
                originalName = "unknown_" + UUID.randomUUID().toString();
            }

            String fileName = originalName.substring(originalName.lastIndexOf("\\") + 1);

            String folderPath = makeFolder();
            String uuid = UUID.randomUUID().toString();
            // Debug Log
            System.out.println("Uploading... Name: " + fileName + ", Size: " + uploadFile.getSize());

            String saveName = uploadPath + File.separator + folderPath + File.separator + uuid + "_" + fileName;
            Path savePath = Paths.get(saveName);

            try {
                uploadFile.transferTo(savePath); // Save file

                String contentType = uploadFile.getContentType();
                if (contentType == null) {
                    try {
                        contentType = Files.probeContentType(savePath);
                    } catch (IOException e) {
                        System.out.println("Failed to probe content type for: " + fileName);
                    }
                }

                String type = "FILE";
                String lowerOriginalName = originalName.toLowerCase();

                if (contentType != null && contentType.startsWith("image")) {
                    type = "IMAGE";
                } else if ((contentType != null && contentType.startsWith("video")) ||
                        (lowerOriginalName.endsWith(".mp4") || lowerOriginalName.endsWith(".avi")
                                || lowerOriginalName.endsWith(".mov") || lowerOriginalName.endsWith(".mkv")
                                || lowerOriginalName.endsWith(".webm"))) {
                    type = "VIDEO";
                } else if (lowerOriginalName.endsWith(".jpg") || lowerOriginalName.endsWith(".jpeg")
                        || lowerOriginalName.endsWith(".png") || lowerOriginalName.endsWith(".gif")
                        || lowerOriginalName.endsWith(".bmp")) {
                    type = "IMAGE";
                }

                resultDTOList.add(new UploadResultDTO(fileName, uuid, folderPath, type));

            } catch (IOException e) {
                e.printStackTrace();
                return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
        return new ResponseEntity<>(resultDTOList, HttpStatus.OK);
    }

    private String makeFolder() {
        String str = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        String folderPath = str.replace("//", File.separator);
        File uploadPathFolder = new File(uploadPath, folderPath);

        if (!uploadPathFolder.exists()) {
            uploadPathFolder.mkdirs();
        }
        return folderPath;
    }

    @GetMapping("/display")
    public ResponseEntity<byte[]> getFile(
            String fileName,
            @RequestHeader(value = "Range", required = false) String rangeHeader) {

        try {
            String srcFileName = URLDecoder.decode(fileName, StandardCharsets.UTF_8);
            File file = new File(uploadPath + File.separator + srcFileName);

            if (!file.exists()) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }

            long fileSize = file.length();
            String contentType = Files.probeContentType(file.toPath());
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Type", contentType);
            headers.add("Accept-Ranges", "bytes");

            // Handle Range requests (essential for video streaming)
            if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                String[] ranges = rangeHeader.substring(6).split("-");
                long start = Long.parseLong(ranges[0]);
                long end = ranges.length > 1 && !ranges[1].isEmpty()
                        ? Long.parseLong(ranges[1])
                        : fileSize - 1;

                if (start >= fileSize || end >= fileSize || start > end) {
                    headers.add("Content-Range", "bytes */" + fileSize);
                    return new ResponseEntity<>(headers, HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
                }

                long contentLength = end - start + 1;

                headers.add("Content-Range", "bytes " + start + "-" + end + "/" + fileSize);
                headers.add("Content-Length", String.valueOf(contentLength));

                // Read the requested byte range
                byte[] data = new byte[(int) contentLength];
                try (var raf = new java.io.RandomAccessFile(file, "r")) {
                    raf.seek(start);
                    raf.readFully(data);
                }

                return new ResponseEntity<>(data, headers, HttpStatus.PARTIAL_CONTENT);
            }

            // Full file response (no range request)
            headers.add("Content-Length", String.valueOf(fileSize));
            byte[] data = FileCopyUtils.copyToByteArray(file);
            return new ResponseEntity<>(data, headers, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/download")
    public ResponseEntity<byte[]> download(String fileName) {
        try {
            String srcFileName = URLDecoder.decode(fileName, StandardCharsets.UTF_8);
            File file = new File(uploadPath + File.separator + srcFileName);

            String originName = file.getName().substring(file.getName().indexOf("_") + 1);
            String encodedName = URLEncoder.encode(originName, StandardCharsets.UTF_8).replaceAll("\\+", "%20");

            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Type", "application/octet-stream");
            headers.add("Content-Disposition", "attachment; filename*=UTF-8''" + encodedName);

            return new ResponseEntity<>(FileCopyUtils.copyToByteArray(file), headers, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
