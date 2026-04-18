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
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import GroupIcon from '@mui/icons-material/Group';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import WhisperIcon from '@mui/icons-material/VolumeDown';

const BACKEND_URL = import.meta.env.VITE_API_URL ||
    (window.location.hostname === 'localhost'
        ? 'http://localhost:8080'
        : `${window.location.protocol}//${window.location.host}`);

const ChatPage = () => {
    const { user, loading: authLoading } = useAuth();
    const [stompClient, setStompClient] = useState(null);
    const [connected, setConnected] = useState(false);
    const [currentTab, setCurrentTab] = useState(0);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [whisperTarget, setWhisperTarget] = useState('');
    const [lastWhisperTarget, setLastWhisperTarget] = useState('');
    const messagesEndRef = useRef(null);
    const subscriptionRef = useRef(null);
    // 익명 채팅: 내가 보낸 메시지 content를 추적하여 에코 중복 방지
    const pendingAnonMessages = useRef(new Set());

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages]);

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
            subscribeToRoom(client, getRoomId());
            client.subscribe('/user/queue/whisper', (message) => {
                const whisperMsg = JSON.parse(message.body);
                setMessages(prev => [...prev, { ...whisperMsg, isWhisper: true }]);
            });
            client.publish({
                destination: `/app/chat.addUser/${getRoomId()}`,
                body: JSON.stringify({ sender: user.nickname, type: 'JOIN' })
            });
            fetchOnlineUsers();
        };

        client.onStompError = (frame) => console.error('STOMP 에러:', frame);
        client.activate();
        setStompClient(client);
        return () => { if (client) client.deactivate(); };
    }, [user]);

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
        if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
        const isAnonRoom = roomId === 'anonymous'; // roomId로 익명 방 판별 (Jackson 직렬화 이슈 우회)
        const subscription = client.subscribe(`/topic/${roomId}`, (message) => {
            const receivedMessage = JSON.parse(message.body);

            // 익명 채팅: pending Set에 있으면 내가 보낸 메시지 → isMine:true
            if (isAnonRoom && receivedMessage.type === 'CHAT') {
                if (pendingAnonMessages.current.has(receivedMessage.content)) {
                    pendingAnonMessages.current.delete(receivedMessage.content);
                    setMessages(prev => [...prev, { ...receivedMessage, isMine: true }]);
                    return;
                }
            }

            setMessages(prev => [...prev, receivedMessage]);
            if (receivedMessage.type === 'JOIN' || receivedMessage.type === 'LEAVE') {
                fetchOnlineUsers();
            }
        });
        subscriptionRef.current = subscription;
    };



    const fetchOnlineUsers = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${BACKEND_URL}/api/chat/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setOnlineUsers(await res.json());
        } catch (error) {
            console.error('온라인 사용자 조회 실패:', error);
        }
    };

    const sendMessage = () => {
        if (!inputMessage.trim() || !stompClient || !connected) return;
        const trimmedMessage = inputMessage.trim();

        const whisperMatch = trimmedMessage.match(/^\/(w|whisper)\s+(\S+)\s+(.+)$/);
        if (whisperMatch) { sendWhisperCommand(whisperMatch[2], whisperMatch[3]); return; }

        const replyMatch = trimmedMessage.match(/^\/r\s+(.+)$/);
        if (replyMatch) {
            if (!lastWhisperTarget) {
                setMessages(prev => [...prev, { type: 'CHAT', sender: '시스템', content: '❌ 답장할 대상이 없습니다. 먼저 귓속말을 보내세요.', timestamp: new Date() }]);
                setInputMessage('');
                return;
            }
            sendWhisperCommand(lastWhisperTarget, replyMatch[1]);
            return;
        }

        const messageBody = {
            sender: currentTab === 1 ? '익명' : user.nickname,
            senderId: user.username || user.nickname,
            content: inputMessage,
            type: 'CHAT',
            roomType: currentTab === 1 ? 'ANONYMOUS' : 'PUBLIC',
            isAnonymous: currentTab === 1,
        };

        // 익명 채팅: 서버 에코가 오기 전에 pending Set에 등록 (isMine 판별용)
        if (currentTab === 1) {
            pendingAnonMessages.current.add(inputMessage);
        }


        stompClient.publish({
            destination: `/app/chat.sendMessage/${getRoomId()}`,
            body: JSON.stringify(messageBody),
        });
        setInputMessage('');
    };


    const sendWhisperCommand = (targetUser, message) => {
        if (!onlineUsers.includes(targetUser)) {
            setMessages(prev => [...prev, { type: 'CHAT', sender: '시스템', content: `❌ "${targetUser}" 사용자를 찾을 수 없습니다.`, timestamp: new Date() }]);
            setInputMessage('');
            return;
        }
        stompClient.publish({
            destination: '/app/chat.whisper',
            body: JSON.stringify({ sender: user.nickname, senderId: user.id, receiver: targetUser, content: message, type: 'WHISPER' })
        });
        setLastWhisperTarget(targetUser);
        setInputMessage('');
    };

    const sendWhisper = () => {
        if (!whisperTarget || !inputMessage.trim() || !stompClient) return;
        stompClient.publish({
            destination: '/app/chat.whisper',
            body: JSON.stringify({ sender: user.nickname, senderId: user.id, receiver: whisperTarget, content: inputMessage, type: 'WHISPER' })
        });
        setLastWhisperTarget(whisperTarget);
        setInputMessage('');
        setWhisperTarget('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            whisperTarget ? sendWhisper() : sendMessage();
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    };

    /* ── 메시지 렌더링 ── */
    const renderMessage = (msg, index) => {
        // isMine 플래그 우선 → 없으면 nickname/sender 비교 (전체 채팅용)
        const isMyMessage = msg.isMine === true
            ? true
            : msg.sender === user?.nickname;
        const isSystemMessage = msg.type === 'JOIN' || msg.type === 'LEAVE';
        const isWhisper = msg.isWhisper || msg.type === 'WHISPER';


        if (isSystemMessage) {
            return (
                <Box key={index} textAlign="center" my={1}>
                    <Chip
                        label={`${msg.sender}님이 ${msg.type === 'JOIN' ? '입장' : '퇴장'}하셨습니다.`}
                        size="small"
                        sx={{
                            bgcolor: msg.type === 'JOIN' ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.04)',
                            color: msg.type === 'JOIN' ? '#34d399' : '#71717a',
                            border: msg.type === 'JOIN' ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(255,255,255,0.07)',
                            fontSize: '0.72rem',
                        }}
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
                            <Avatar sx={{
                                width: 22, height: 22, fontSize: '0.68rem',
                                bgcolor: 'rgba(255,255,255,0.08)', color: '#a1a1aa',
                            }}>
                                {msg.sender[0]}
                            </Avatar>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa' }}>
                                {msg.sender}
                            </Typography>
                            {isWhisper && (
                                <Chip label="🔒 귓속말" size="small" sx={{
                                    height: 16, bgcolor: 'rgba(168,85,247,0.1)', color: '#c084fc',
                                    border: '1px solid rgba(168,85,247,0.2)', fontSize: '0.6rem', fontWeight: 700,
                                }} />
                            )}
                        </Box>
                    )}
                    {isMyMessage && isWhisper && (
                        <Box display="flex" alignItems="center" gap={0.5} mb={0.5} justifyContent="flex-end">
                            <Chip label={`🔒 ${msg.receiver}님에게 귓속말`} size="small" sx={{
                                height: 16, bgcolor: 'rgba(168,85,247,0.1)', color: '#c084fc',
                                border: '1px solid rgba(168,85,247,0.2)', fontSize: '0.6rem', fontWeight: 700,
                            }} />
                        </Box>
                    )}
                    <Box
                        sx={{
                            px: 1.8, py: 1.2,
                            borderRadius: isMyMessage ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            bgcolor: isMyMessage
                                ? (isWhisper ? 'rgba(147,51,234,0.3)' : 'rgba(99,102,241,0.22)')
                                : (isWhisper ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.05)'),
                            border: isWhisper
                                ? '1px solid rgba(168,85,247,0.25)'
                                : isMyMessage
                                    ? '1px solid rgba(99,102,241,0.3)'
                                    : '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <Typography sx={{ color: '#e4e4e7', fontSize: '0.88rem', lineHeight: 1.5 }}>
                            {msg.content}
                        </Typography>
                        <Typography sx={{ color: '#52525b', fontSize: '0.68rem', display: 'block', mt: 0.5, textAlign: isMyMessage ? 'right' : 'left' }}>
                            {formatTime(msg.timestamp)}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        );
    };

    /* ── 로딩 상태 ── */
    if (authLoading || !user) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#000' }}>
                <Box sx={{
                    width: 32, height: 32,
                    border: '3px solid rgba(255,255,255,0.08)',
                    borderTop: '3px solid #818cf8',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </Box>
        );
    }

    return (
        <>
            <Helmet>
                <title>채팅 - TerminalNexus | 실시간 채팅</title>
                <meta name="description" content="TerminalNexus 실시간 채팅. 전체 채팅, 익명 채팅, 귓속말 기능 제공" />
            </Helmet>

            <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff', pt: { xs: 10, md: 12 }, pb: 4, px: { xs: 1, md: 2 } }}>
                <Container maxWidth="lg">
                    <Box display="flex" gap={2} height="calc(100vh - 140px)">

                        {/* ── 왼쪽: 채팅 영역 ── */}
                        <Box
                            sx={{
                                flex: 1, display: 'flex', flexDirection: 'column',
                                borderRadius: '20px',
                                border: '1px solid rgba(255,255,255,0.07)',
                                bgcolor: 'rgba(255,255,255,0.02)',
                                overflow: 'hidden',
                            }}
                        >
                            {/* 헤더 */}
                            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#f4f4f5' }}>
                                    💬 채팅
                                </Typography>
                                <Chip
                                    label={connected ? '● 연결됨' : '○ 연결 중...'}
                                    size="small"
                                    sx={{
                                        bgcolor: connected ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
                                        color: connected ? '#34d399' : '#71717a',
                                        border: connected ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.08)',
                                        fontSize: '0.7rem', fontWeight: 600,
                                    }}
                                />
                            </Box>

                            {/* 탭 */}
                            <Tabs
                                value={currentTab}
                                onChange={(e, v) => setCurrentTab(v)}
                                sx={{
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                    '& .MuiTab-root': { color: '#71717a', textTransform: 'none', fontWeight: 500, fontSize: '0.85rem', minHeight: 48 },
                                    '& .Mui-selected': { color: '#818cf8 !important' },
                                    '& .MuiTabs-indicator': { bgcolor: '#818cf8' },
                                }}
                            >
                                <Tab icon={<GroupIcon sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="전체 채팅" />
                                <Tab icon={<VisibilityOffIcon sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="익명 채팅" />
                            </Tabs>

                            {/* 메시지 영역 */}
                            <Box flex={1} overflow="auto" p={2.5} sx={{
                                '&::-webkit-scrollbar': { width: 4 },
                                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
                            }}>
                                {messages.map((msg, index) => renderMessage(msg, index))}
                                <div ref={messagesEndRef} />
                            </Box>

                            {/* 입력 영역 */}
                            <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.06)', bgcolor: 'rgba(0,0,0,0.2)' }}>
                                {whisperTarget && (
                                    <Box mb={1.5}>
                                        <Chip
                                            label={`💬 ${whisperTarget}님에게 귓속말`}
                                            onDelete={() => setWhisperTarget('')}
                                            size="small"
                                            sx={{
                                                bgcolor: 'rgba(168,85,247,0.1)', color: '#c084fc',
                                                border: '1px solid rgba(168,85,247,0.25)', fontWeight: 600,
                                                '& .MuiChip-deleteIcon': { color: '#c084fc', '&:hover': { color: '#a855f7' } },
                                            }}
                                        />
                                    </Box>
                                )}
                                <Box display="flex" gap={1.5} alignItems="center">
                                    <TextField
                                        fullWidth multiline maxRows={3}
                                        placeholder={whisperTarget ? `${whisperTarget}님에게 귓속말...` : '메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)'}
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        disabled={!connected}
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                bgcolor: 'rgba(255,255,255,0.04)', borderRadius: '12px', color: '#f4f4f5',
                                                '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
                                                '&.Mui-focused fieldset': { borderColor: '#818cf8' },
                                            },
                                            '& .MuiInputBase-input::placeholder': { color: '#52525b', opacity: 1 },
                                        }}
                                    />
                                    <Button
                                        variant="contained"
                                        onClick={whisperTarget ? sendWhisper : sendMessage}
                                        disabled={!connected || !inputMessage.trim()}
                                        sx={{
                                            minWidth: 90, height: 56, borderRadius: '12px',
                                            fontWeight: 700, fontSize: '0.88rem', textTransform: 'none',
                                            bgcolor: whisperTarget ? '#9333ea' : '#818cf8', color: '#fff', boxShadow: 'none',
                                            '&:hover:not(:disabled)': { bgcolor: whisperTarget ? '#7c3aed' : '#6366f1', transform: 'translateY(-1px)' },
                                            '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.05)', color: '#3f3f46' },
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <SendIcon sx={{ fontSize: '1.1rem', mr: 0.5 }} />
                                        전송
                                    </Button>
                                </Box>
                            </Box>
                        </Box>

                        {/* ── 오른쪽: 온라인 사용자 ── */}
                        <Box
                            sx={{
                                width: 220, display: { xs: 'none', md: 'flex' }, flexDirection: 'column',
                                borderRadius: '20px',
                                border: '1px solid rgba(255,255,255,0.07)',
                                bgcolor: 'rgba(255,255,255,0.02)',
                                p: 2.5, overflow: 'hidden',
                            }}
                        >
                            <Typography sx={{ color: '#52525b', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', mb: 1.5 }}>
                                Online
                            </Typography>
                            <Chip
                                label={`${onlineUsers.length}명 접속 중`}
                                size="small"
                                sx={{ mb: 2, alignSelf: 'flex-start', bgcolor: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', fontSize: '0.72rem' }}
                            />
                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2 }} />
                            <Box flex={1} overflow="auto" sx={{
                                '&::-webkit-scrollbar': { width: 3 },
                                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
                            }}>
                                <List dense disablePadding>
                                    {onlineUsers.map((username, index) => (
                                        <ListItem
                                            key={index}
                                            sx={{ px: 0.5, py: 0.8, borderRadius: '8px', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                                            secondaryAction={
                                                username !== user.nickname && (
                                                    <IconButton
                                                        edge="end" size="small"
                                                        onClick={() => setWhisperTarget(username)}
                                                        title="귓속말"
                                                        sx={{ color: '#3f3f46', '&:hover': { color: '#c084fc', bgcolor: 'rgba(168,85,247,0.08)' } }}
                                                    >
                                                        <WhisperIcon sx={{ fontSize: '0.9rem' }} />
                                                    </IconButton>
                                                )
                                            }
                                        >
                                            <Badge
                                                color="success" variant="dot" overlap="circular"
                                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                sx={{ '& .MuiBadge-badge': { bgcolor: '#34d399', width: 8, height: 8, boxShadow: '0 0 5px #34d399' } }}
                                            >
                                                <Avatar sx={{
                                                    width: 28, height: 28, mr: 1.2,
                                                    bgcolor: username === user.nickname ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.06)',
                                                    color: username === user.nickname ? '#818cf8' : '#71717a',
                                                    fontSize: '0.72rem', fontWeight: 700, border: username === user.nickname ? '1px solid rgba(129,140,248,0.3)' : 'none',
                                                }}>
                                                    {username[0]}
                                                </Avatar>
                                            </Badge>
                                            <ListItemText
                                                primary={username}
                                                primaryTypographyProps={{
                                                    fontSize: '0.8rem',
                                                    fontWeight: username === user.nickname ? 700 : 400,
                                                    color: username === user.nickname ? '#818cf8' : '#a1a1aa',
                                                    noWrap: true,
                                                }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        </Box>

                    </Box>
                </Container>
            </Box>
        </>
    );
};

export default ChatPage;
