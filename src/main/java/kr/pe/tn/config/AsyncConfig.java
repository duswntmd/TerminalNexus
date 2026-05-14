package kr.pe.tn.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * 비동기 처리 설정
 *
 * 채팅 메시지 DB 저장을 비동기로 처리하여
 * WebSocket 응답 지연을 0ms로 유지합니다.
 *
 * 스레드풀 설정 근거:
 * - corePoolSize(2): 평시 최소 스레드 수
 * - maxPoolSize(5): 채팅 폭탄 상황에서도 최대 5개로 제한 (DB 커넥션 고려)
 * - queueCapacity(500): 큐에 최대 500개 메시지 버퍼링 가능
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "chatSaveExecutor")
    public Executor chatSaveExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("chat-save-");
        executor.initialize();
        return executor;
    }
}
