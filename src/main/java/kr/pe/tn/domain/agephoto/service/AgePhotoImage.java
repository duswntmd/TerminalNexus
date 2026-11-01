package kr.pe.tn.domain.agephoto.service;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;

/** 업로드 사진 검증과 정리: 다시 그려서 위치정보 같은 메타데이터를 없애고 크기를 줄인다 */
final class AgePhotoImage {

    private static final int MAX_SOURCE_SIDE = 8000;
    private static final int MIN_SOURCE_SIDE = 128;
    private static final int MAX_OUTPUT_SIDE = 1024;

    private AgePhotoImage() {
    }

    static byte[] sanitize(byte[] data) {
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(data))) {
            Iterator<ImageReader> readers = in == null ? null : ImageIO.getImageReaders(in);
            if (readers == null || !readers.hasNext()) throw notImage();
            ImageReader reader = readers.next();
            try {
                String format = reader.getFormatName().toLowerCase();
                if (!format.equals("jpeg") && !format.equals("png")) throw notImage();
                reader.setInput(in, true, true);
                // 압축 폭탄 방지: 픽셀을 풀기 전에 크기부터 확인
                int w = reader.getWidth(0);
                int h = reader.getHeight(0);
                if (Math.max(w, h) > MAX_SOURCE_SIDE) throw new IllegalArgumentException("사진 크기가 너무 큽니다.");
                if (Math.min(w, h) < MIN_SOURCE_SIDE) throw new IllegalArgumentException("사진이 너무 작습니다.");
                return encode(resize(reader.read(0)));
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw notImage();
        }
    }

    private static IllegalArgumentException notImage() {
        return new IllegalArgumentException("JPG 또는 PNG 사진만 사용할 수 있습니다.");
    }

    private static BufferedImage resize(BufferedImage src) {
        double scale = Math.min(1.0, (double) MAX_OUTPUT_SIDE / Math.max(src.getWidth(), src.getHeight()));
        int w = Math.max(1, (int) Math.round(src.getWidth() * scale));
        int h = Math.max(1, (int) Math.round(src.getHeight() * scale));
        BufferedImage out = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, w, h);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.drawImage(src, 0, 0, w, h, null);
        g.dispose();
        return out;
    }

    private static byte[] encode(BufferedImage img) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (MemoryCacheImageOutputStream out = new MemoryCacheImageOutputStream(bytes)) {
            writer.setOutput(out);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(0.9f);
            writer.write(null, new IIOImage(img, null, null), param);
        } finally {
            writer.dispose();
        }
        return bytes.toByteArray();
    }
}
