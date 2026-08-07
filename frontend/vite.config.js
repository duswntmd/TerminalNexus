import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        // rewrite 제거 - /api 경로 그대로 유지
      },
      "/ws-chat": {
        target: "http://localhost:8080",
        changeOrigin: true,
        ws: true,
      },
      "/oauth2": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/login": {
        target: "http://localhost:8080",
        changeOrigin: true,
        bypass: function(req, res, proxyOptions) {
          if (req.headers.accept.indexOf('html') !== -1) {
            return '/index.html';
          }
        }
      },
      "/logout": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/display": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/download": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/upload": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/admin": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/freeboard": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      // /user는 프론트엔드 라우팅이므로 프록시 제거
    },
  },
  define: {
    global: 'window',
  },
  // ✅ 프로덕션 빌드 시 console 및 debugger 자동 제거
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});
