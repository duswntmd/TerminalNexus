import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import {
    Container,
    Typography,
    TextField,
    Button,
    Box,
    Paper,
    List,
    ListItem,
    ListItemText,
    Tabs,
    Tab,
    Chip,
    Avatar,
    Divider,
    IconButton,
    Badge,
    Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import WhisperIcon from '@mui/icons-material/VolumeDown';

// 환경에 따라 자동으로 백엔드 URL 설정
const BACKEND_URL = import.meta.env.VITE_API_URL || 
    (window.location.hostname === 'localhost' 
        ? 'http://localhost:8080' 
        : `${window.location.protocol}//${window.location.host}`);

// 실시간 채팅 페이지 - 2026.01.18 업데이트

const ChatPage = () => {
    const { user } = useAuth();
    const [stompClient, setStompClient] = useState(null);
    const [connected, setConnected] = useState(false);
    const [currentTab, setCurrentTab] = useState(0); // 0: 전체, 1: 익명, 2: 1:1
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [whisperTarget, setWhisperTarget] = useState('');
    const [lastWhisperTarget, setLastWhisperTarget] = useState(''); // 마지막 귓속말 대상
    const messagesEndRef = useRef(null);
    const subscriptionRef = useRef(null); // 현재 구독 저장


    // 자동 스크롤
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // WebSocket 연결
    useEffect(() => {
        if (!user) return;

        const socket = new SockJS(`${BACKEND_URL}/ws-chat`);
        const client = new Client({
            webSocketFactory: () => socket,
            debug: (str) => console.log(str),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.onConnect = () => {
            console.log('WebSocket 연결 성공!');
            setConnected(true);

            // 현재 탭에 따라 구독
            subscribeToRoom(client, getRoomId());

            // 귓속말 구독
            client.subscribe('/user/queue/whisper', (message) => {
                const whisperMsg = JSON.parse(message.body);
                setMessages(prev => [...prev, { ...whisperMsg, isWhisper: true }]);
            });

            // 입장 메시지 전송
            client.publish({
                destination: `/app/chat.addUser/${getRoomId()}`,
                body: JSON.stringify({
                    sender: user.nickname,
                    type: 'JOIN'
                })
            });

            // 온라인 사용자 목록 조회
            fetchOnlineUsers();
        };

        client.onStompError = (frame) => {
            console.error('STOMP 에러:', frame);
        };

        client.activate();
        setStompClient(client);

        return () => {
            if (client) {
                client.deactivate();
            }
        };
    }, [user]);

    // 탭 변경 시 재구독
    useEffect(() => {
        if (stompClient && connected) {
            setMessages([]);
            subscribeToRoom(stompClient, getRoomId());
        }
    }, [currentTab]);

    const getRoomId = () => {
        switch (currentTab) {
            case 0: return 'public';
            case 1: return 'anonymous';
            default: return 'public';
        }
    };

    const subscribeToRoom = (client, roomId) => {
        // 이전 구독 해제
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
        }

        // 새로운 구독
        const subscription = client.subscribe(`/topic/${roomId}`, (message) => {
            const receivedMessage = JSON.parse(message.body);
            setMessages(prev => [...prev, receivedMessage]);
            
            // 입장/퇴장 메시지일 때 온라인 사용자 목록 업데이트
            if (receivedMessage.type === 'JOIN' || receivedMessage.type === 'LEAVE') {
                fetchOnlineUsers();
            }
        });

        // 구독 저장
        subscriptionRef.current = subscription;
    };

    const fetchOnlineUsers = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${BACKEND_URL}/api/chat/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (res.ok) {
                const users = await res.json();
                setOnlineUsers(users);
            }
        } catch (error) {
            console.error('온라인 사용자 조회 실패:', error);
        }
    };

    const sendMessage = () => {
        if (!inputMessage.trim() || !stompClient || !connected) return;

        // 명령어 처리
        const trimmedMessage = inputMessage.trim();
        
        // /w 또는 /whisper 명령어 처리
        const whisperMatch = trimmedMessage.match(/^\/(w|whisper)\s+(\S+)\s+(.+)$/);
        if (whisperMatch) {
            const targetUser = whisperMatch[2];
            const message = whisperMatch[3];
            sendWhisperCommand(targetUser, message);
            return;
        }

        // /r 명령어 처리 (마지막 귓속말 대상에게 답장)
        const replyMatch = trimmedMessage.match(/^\/r\s+(.+)$/);
        if (replyMatch) {
            if (!lastWhisperTarget) {
                setMessages(prev => [...prev, {
                    type: 'CHAT',
                    sender: '시스템',
                    content: '❌ 답장할 대상이 없습니다. 먼저 귓속말을 보내세요.',
                    timestamp: new Date()
                }]);
                setInputMessage('');
                return;
            }
            const message = replyMatch[1];
            sendWhisperCommand(lastWhisperTarget, message);
            return;
        }

        // 일반 메시지 전송
        const chatMessage = {
            sender: currentTab === 1 ? '익명' : user.nickname,
            senderId: user.id,
            content: inputMessage,
            type: 'CHAT',
            roomType: currentTab === 1 ? 'ANONYMOUS' : 'PUBLIC',
            isAnonymous: currentTab === 1
        };

        stompClient.publish({
            destination: `/app/chat.sendMessage/${getRoomId()}`,
            body: JSON.stringify(chatMessage)
        });

        setInputMessage('');
    };

    const sendWhisperCommand = (targetUser, message) => {
        if (!onlineUsers.includes(targetUser)) {
            setMessages(prev => [...prev, {
                type: 'CHAT',
                sender: '시스템',
                content: `❌ "${targetUser}" 사용자를 찾을 수 없습니다.`,
                timestamp: new Date()
            }]);
            setInputMessage('');
            return;
        }

        const whisperMessage = {
            sender: user.nickname,
            senderId: user.id,
            receiver: targetUser,
            content: message,
            type: 'WHISPER'
        };

        stompClient.publish({
            destination: '/app/chat.whisper',
            body: JSON.stringify(whisperMessage)
        });

        setLastWhisperTarget(targetUser);
        setInputMessage('');
    };

    const sendWhisper = () => {
        if (!whisperTarget || !inputMessage.trim() || !stompClient) return;

        const whisperMessage = {
            sender: user.nickname,
            senderId: user.id,
            receiver: whisperTarget,
            content: inputMessage,
            type: 'WHISPER'
        };

        stompClient.publish({
            destination: '/app/chat.whisper',
            body: JSON.stringify(whisperMessage)
        });

        setLastWhisperTarget(whisperTarget); // 마지막 귓속말 대상 저장
        setInputMessage('');
        setWhisperTarget('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (whisperTarget) {
                sendWhisper();
            } else {
                sendMessage();
            }
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessage = (msg, index) => {
        const isMyMessage = msg.sender === user?.nickname;
        const isSystemMessage = msg.type === 'JOIN' || msg.type === 'LEAVE';
        const isWhisper = msg.isWhisper || msg.type === 'WHISPER';

        if (isSystemMessage) {
            return (
                <Box key={index} textAlign="center" my={1}>
                    <Chip 
                        label={`${msg.sender}님이 ${msg.type === 'JOIN' ? '입장' : '퇴장'}하셨습니다.`}
                        size="small"
                        color={msg.type === 'JOIN' ? 'success' : 'default'}
                    />
                </Box>
            );
        }

        return (
            <Box
                key={index}
                display="flex"
                justifyContent={isMyMessage ? 'flex-end' : 'flex-start'}
                mb={1.5}
            >
                <Box maxWidth="70%">
                    {!isMyMessage && (
                        <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                {msg.sender[0]}
                            </Avatar>
                            <Typography variant="caption" fontWeight="bold">
                                {msg.sender}
                            </Typography>
                            {isWhisper && (
                                <Chip 
                                    label="🔒 귓속말" 
                                    size="small" 
                                    color="secondary" 
                                    sx={{ 
                                        height: 18,
                                        fontWeight: 'bold',
                                        fontSize: '0.65rem'
                                    }} 
                                />
                            )}
                        </Box>
                    )}
                    {isMyMessage && isWhisper && (
                        <Box display="flex" alignItems="center" gap={0.5} mb={0.5} justifyContent="flex-end">
                            <Chip 
                                label={`🔒 ${msg.receiver}님에게 귓속말`}
                                size="small" 
                                color="secondary" 
                                sx={{ 
                                    height: 18,
                                    fontWeight: 'bold',
                                    fontSize: '0.65rem'
                                }} 
                            />
                        </Box>
                    )}
                    <Paper
                        elevation={isWhisper ? 4 : 1}
                        sx={{
                            p: 1.5,
                            bgcolor: isMyMessage 
                                ? (isWhisper ? '#9c27b0' : 'primary.main')
                                : (isWhisper ? '#f3e5f5' : 'grey.100'),
                            color: isMyMessage ? 'white' : 'text.primary',
                            borderRadius: 2,
                            border: isWhisper ? '2px solid #9c27b0' : 'none'
                        }}
                    >
                        <Typography variant="body1">{msg.content}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                            {formatTime(msg.timestamp)}
                        </Typography>
                    </Paper>
                </Box>
            </Box>
        );
    };

    return (
        <>
            <Helmet>
                <title>채팅 - TerminalNexus | 실시간 채팅</title>
                <meta name="description" content="TerminalNexus 실시간 채팅. 전체 채팅, 익명 채팅, 1:1 채팅, 귓속말 기능 제공" />
            </Helmet>

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Box display="flex" gap={2} height="calc(100vh - 150px)">
                    {/* 왼쪽: 채팅 영역 */}
                    <Paper elevation={3} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {/* 헤더 */}
                        <Box p={2} borderBottom="1px solid #e0e0e0">
                            <Typography variant="h5" fontWeight="bold">
                                💬 채팅
                            </Typography>
                            <Chip 
                                label={connected ? '연결됨' : '연결 중...'} 
                                color={connected ? 'success' : 'default'}
                                size="small"
                                sx={{ mt: 1 }}
                            />
                        </Box>

                        {/* 탭 */}
                        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tab icon={<GroupIcon />} label="전체 채팅" />
                            <Tab icon={<VisibilityOffIcon />} label="익명 채팅" />
                        </Tabs>

                        {/* 메시지 영역 */}
                        <Box flex={1} overflow="auto" p={2} bgcolor="#fafafa">
                            {messages.map((msg, index) => renderMessage(msg, index))}
                            <div ref={messagesEndRef} />
                        </Box>

                        {/* 입력 영역 */}
                        <Box p={2} borderTop="1px solid #e0e0e0" bgcolor="#f9f9f9">
                            {whisperTarget && (
                                <Box mb={1.5}>
                                    <Chip
                                        label={`💬 ${whisperTarget}님에게 귓속말`}
                                        onDelete={() => setWhisperTarget('')}
                                        color="secondary"
                                        size="small"
                                        sx={{ fontWeight: 'bold' }}
                                    />
                                </Box>
                            )}
                            <Box display="flex" gap={1.5} alignItems="center">
                                <TextField
                                    fullWidth
                                    multiline
                                    maxRows={3}
                                    placeholder={whisperTarget ? `${whisperTarget}님에게 귓속말을 입력하세요...` : "메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"}
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    disabled={!connected}
                                    variant="outlined"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 3,
                                            bgcolor: 'white',
                                            '&:hover': {
                                                '& > fieldset': {
                                                    borderColor: 'primary.main'
                                                }
                                            }
                                        }
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={whisperTarget ? sendWhisper : sendMessage}
                                    disabled={!connected || !inputMessage.trim()}
                                    sx={{
                                        minWidth: 100,
                                        height: 56,
                                        borderRadius: 3,
                                        fontWeight: 'bold',
                                        fontSize: '1rem',
                                        boxShadow: 3,
                                        '&:hover': {
                                            boxShadow: 6,
                                            transform: 'translateY(-2px)',
                                            transition: 'all 0.2s'
                                        },
                                        '&:disabled': {
                                            bgcolor: 'grey.300'
                                        }
                                    }}
                                >
                                    <SendIcon sx={{ mr: 0.5 }} />
                                    전송
                                </Button>
                            </Box>
                        </Box>
                    </Paper>

                    {/* 오른쪽: 온라인 사용자 */}
                    <Paper elevation={3} sx={{ width: 250, p: 2 }}>
                        <Typography variant="h6" fontWeight="bold" mb={2}>
                            👥 온라인 ({onlineUsers.length})
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <List dense>
                            {onlineUsers.map((username, index) => (
                                <ListItem
                                    key={index}
                                    secondaryAction={
                                        username !== user.nickname && (
                                            <IconButton
                                                edge="end"
                                                size="small"
                                                onClick={() => setWhisperTarget(username)}
                                                title="귓속말"
                                            >
                                                <WhisperIcon fontSize="small" />
                                            </IconButton>
                                        )
                                    }
                                >
                                    <Badge
                                        color="success"
                                        variant="dot"
                                        overlap="circular"
                                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    >
                                        <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                                            {username[0]}
                                        </Avatar>
                                    </Badge>
                                    <ListItemText
                                        primary={username}
                                        primaryTypographyProps={{
                                            fontWeight: username === user.nickname ? 'bold' : 'normal'
                                        }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Box>
            </Container>
        </>
    );
};

export default ChatPage;
