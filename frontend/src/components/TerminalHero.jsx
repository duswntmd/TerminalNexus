import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RockyTerminal from './rocky/RockyTerminal';
import './TerminalHero.css';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const TerminalHero = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [promptUser, setPromptUser] = useState('Guest');
  const [mode, setMode] = useState('cmd'); // 'cmd' | 'rocky'
  const cmdHistory = useRef([]);
  const cmdHistIdx = useRef(-1);
  const scrollRef = useRef(null);

  // Fetch nickname if logged in
  useEffect(() => {
    const fetchNickname = async () => {
      if (isLoggedIn) {
        try {
          // 닉네임은 표시용이라 토큰이 만료돼도 로그인 페이지로 보내지 않음 (fetchWithAccess 미사용)
          const res = await fetch(`${BACKEND_API_BASE_URL}/user`, {
             method: 'GET',
             headers: {
               'Content-Type': 'application/json',
               Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
             },
          });
          if (res.ok) {
            const data = await res.json();
            setPromptUser(data.nickname || 'Guest');
          }
        } catch {
          // Ignore error, stay as Guest
        }
      } else {
        setPromptUser('Guest');
      }
    };
    fetchNickname();
  }, [isLoggedIn]);

  // Initial Welcome Message
  const welcomeText = [
    "Welcome to TN (Terminal Nexus) CLI v1.0.0",
    "",
    "Type 'ls' to see available commands.",
    "Type 'rocky' to try a Rocky Linux 9.6 shell right here."
  ];

  // ... (Typewriter effect unchanged)
  useEffect(() => {
    let lineIndex = 0;
    let charIndex = 0;
    let currentLines = [];
    const typeSpeed = 30; // ms per char

    const typeWriter = () => {
      if (lineIndex < welcomeText.length) {
        const line = welcomeText[lineIndex];
        if (charIndex < line.length) {
          const currentLineText = line.substring(0, charIndex + 1);
          setHistory([...currentLines, { type: 'text', content: currentLineText }]);
          charIndex++;
          setTimeout(typeWriter, typeSpeed);
        } else {
          // Line finished
          currentLines.push({ type: 'text', content: line });
          setHistory([...currentLines]);
          lineIndex++;
          charIndex = 0;
          setTimeout(typeWriter, 100); // Pause between lines
        }
      } else {
        setIsTyping(false);
      }
    };

    typeWriter();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isTyping]);

  const handleCommand = (cmd) => {
    const trimmedCmd = cmd.trim().toLowerCase();
    let output = [];

    switch (trimmedCmd) {
      case '/help':
        output = [
          "Available commands:",
          "  /help     - Show this help message",
          "  ls        - List available commands",
          "  /forge    - Go to RPG Forge Game",
          "  /chat     - Open Anonymous Chat",
          "  /login    - Go to login page",
          "  /join     - Go to sign up page",
          "  freeboard - Go to community board",
          "  /guide    - Go to user guide",
          "  rocky     - Open Rocky Linux 9.6 shell (here)",
          "  /linux    - Open Rocky Linux lab (full screen)",
          "  clear     - Clear terminal screen"
        ];
        break;
      case 'ls':
        output = [
          "COMMANDS:",
          "  /help",
          "  ls",
          "  /forge",
          "  /chat",
          "  /login",
          "  /join",
          "  freeboard",
          "  /guide",
          "  rocky",
          "  /linux",
          "  clear"
        ];
        break;
      case '/forge':
        output = ["Entering Forge Sanctuary..."];
        setTimeout(() => navigate('/forge'), 800);
        break;
      case '/chat':
        output = ["Connecting to Anonymous Chat..."];
        setTimeout(() => navigate('/chat'), 800);
        break;
      case 'freeboard':
        output = ["Redirecting to Free Board..."];
        setTimeout(() => navigate('/freeboard'), 800);
        break;
      case '/login':
        output = ["Redirecting to Login..."];
        setTimeout(() => navigate('/login'), 800);
        break;
      case '/join':
      case '지금 시작하기': // Easter egg or alternative
        output = ["Redirecting to Sign Up..."];
        setTimeout(() => navigate('/join'), 800);
        break;
      case '/guide':
        output = ["Opening User Guide..."];
        setTimeout(() => navigate('/guide'), 800);
        break;
      case 'rocky':
      case '/rocky':
      case 'ssh rocky':
        setHistory(prev => [...prev, { type: 'input', content: `C:\\Users\\${promptUser}> ${cmd}` }]);
        setMode('rocky');
        return;
      case '/linux':
      case 'linux':
        output = ["Opening Rocky Linux Lab..."];
        setTimeout(() => navigate('/play/linux'), 800);
        break;
      case 'clear':
        setHistory([]);
        return; // Early return to avoid adding command to history
      case '':
        break;
      default:
        output = [`'${cmd}' is not recognized as an internal or external command.`];
    }

    setHistory(prev => [
      ...prev, 
      { type: 'input', content: `C:\\Users\\${promptUser}> ${cmd}` },
      ...output.map(line => ({ type: 'text', content: line }))
    ]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (input.trim()) cmdHistory.current.push(input);
      cmdHistIdx.current = -1;
      handleCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const h = cmdHistory.current;
      if (!h.length) return;
      e.preventDefault();
      let i = cmdHistIdx.current === -1 ? h.length : cmdHistIdx.current;
      i = e.key === 'ArrowUp' ? Math.max(0, i - 1) : i + 1;
      if (i >= h.length) { cmdHistIdx.current = -1; setInput(''); return; }
      cmdHistIdx.current = i;
      setInput(h[i]);
    }
  };

  const exitRocky = () => {
    setMode('cmd');
    setHistory(prev => [...prev, { type: 'text', content: 'Connection to rocky closed.' }]);
    setTimeout(() => document.getElementById('terminal-input')?.focus({ preventScroll: true }), 0);
  };

  return (
    <div className="terminal-hero" onClick={() => mode === 'cmd' && !isTyping && document.getElementById('terminal-input')?.focus({ preventScroll: true })}>
      <div className="terminal-window">
        <div className="terminal-header">
          <div className="window-controls">
            <span className="control close"></span>
            <span className="control minimize"></span>
            <span className="control maximize"></span>
          </div>
          <div className="window-title">{mode === 'rocky' ? 'Rocky Linux 9.6 - ssh rocky' : 'Command Prompt - TN CLI'}</div>
        </div>
        {mode === 'rocky' ? (
          <RockyTerminal embedded user={promptUser} onExit={exitRocky} />
        ) : (
        <div className="terminal-body" ref={scrollRef}>
          {history.map((line, i) => (
            <div key={i} className={`line ${line.type}`}>
               {line.content}
            </div>
          ))}
          {!isTyping && (
            <div className="input-line">
              <span className="prompt">C:\Users\{promptUser}&gt;</span>
              <input 
                id="terminal-input"
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={handleKeyDown}
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default TerminalHero;
