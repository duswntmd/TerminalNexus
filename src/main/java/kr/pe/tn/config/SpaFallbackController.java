package kr.pe.tn.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * SPA(Single Page Application) Fallback 컨트롤러
 * - /api/** 와 /ws/** 를 제외한 모든 경로를 index.html 로 포워딩
 * - React Router가 클라이언트 사이드에서 라우팅을 처리
 */
@Controller
public class SpaFallbackController {

    @RequestMapping(value = {
        "/{path:[^\\.]*}",            // 1단계 경로 (예: /login, /forge)
        "/{path:[^\\.]*}/**"          // 다단계 경로 (예: /freeboard/123)
    })
    public String forwardToIndex(HttpServletRequest request) {
        String uri = request.getRequestURI();
        // /api, /ws, /oauth2, /jwt 요청은 포워딩하지 않음
        if (uri.startsWith("/api/") || uri.startsWith("/ws/")
                || uri.startsWith("/oauth2/") || uri.startsWith("/jwt/")) {
            return null;
        }
        return "forward:/index.html";
    }
}
