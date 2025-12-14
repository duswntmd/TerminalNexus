package kr.pe.tn.domain.freeboard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UploadResultDTO implements Serializable {

    public UploadResultDTO(String fileName, String uuid, String folderPath, String type) {
        this.fileName = fileName;
        this.uuid = uuid;
        this.folderPath = folderPath;
        this.type = type;
    }

    private String fileName;
    private String uuid;
    private String folderPath;
    private String type; // IMAGE, VIDEO, YOUTUBE
    private String youtubeUrl;

    public String getImageURL() {
        try {
            return URLEncoder.encode(folderPath + "/" + uuid + "_" + fileName, StandardCharsets.UTF_8.toString());
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        }
        return "";
    }

    public String getThumbnailURL() {
        try {
            return URLEncoder.encode(folderPath + "/s_" + uuid + "_" + fileName, StandardCharsets.UTF_8.toString());
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        }
        return "";
    }
}
