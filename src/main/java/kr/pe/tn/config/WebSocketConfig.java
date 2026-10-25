package kr.pe.tn.config;

import kr.pe.tn.domain.user.repository.UserRepository;
import kr.pe.tn.util.JWTUtil;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

/**
 * WebSocket 설정
 * STOMP 프로토콜을 사용한 실시간 채팅 시스템
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final UserRepository userRepository;

    public WebSocketConfig(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * 메시지 브로커 설정
     * - /topic: 전체 채팅 (1:N 브로드캐스트)
     * - /queue: 1:1 채팅 (개인 메시지)
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // 메시지 브로커 활성화: /topic (전체), /queue (개인)
        config.enableSimpleBroker("/topic", "/queue");

        // 클라이언트가 메시지를 보낼 때 사용할 prefix
        config.setApplicationDestinationPrefixes("/app");

        // 개인 메시지 prefix
        config.setUserDestinationPrefix("/user");
    }

    /**
     * WebSocket 엔드포인트 등록
     * 클라이언트가 WebSocket에 연결할 때 사용하는 URL
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 순수 WebSocket 엔드포인트 (brokerURL: ws://.../ws-chat 지원)
        registry.addEndpoint("/ws-chat")
                .setAllowedOriginPatterns("*");

        // SockJS 지원 엔드포인트
        registry.addEndpoint("/ws-chat")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    /**
     * STOMP CONNECT 시 Authorization 헤더의 AccessToken 검증
     * - 유효하면 세션 사용자(Principal) 이름을 닉네임으로 설정 → 귓속말(/user/queue/whisper) 라우팅에 사용
     * - 토큰이 없으면 비로그인 연결로 허용 (주식 시세 등 공개 구독용)
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null || accessor.getCommand() != StompCommand.CONNECT) {
                    return message;
                }

                String authorization = accessor.getFirstNativeHeader("Authorization");
                if (authorization == null || !authorization.startsWith("Bearer ")) {
                    return message;
                }

                String token = authorization.substring(7);
                if (!JWTUtil.isValid(token, true)) {
                    return message;
                }

                String username = JWTUtil.getUsername(token);
                String role = JWTUtil.getRole(token);
                userRepository.findByUsernameAndIsLock(username, false).ifPresent(user -> {
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            user.getNickname(), null, List.of(new SimpleGrantedAuthority(role)));
                    auth.setDetails(username); // 실제 로그인 ID (채팅 senderId 저장용)
                    accessor.setUser(auth);
                });
                return message;
            }
        });
    }
}
