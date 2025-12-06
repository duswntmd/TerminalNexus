import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './TerminalHero.css';

const TerminalHero = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const scrollRef = useRef(null);

  // Initial Welcome Message
  // Initial Welcome Message
  const welcomeText = [
    "Welcome to TN (Terminal Nexus) CLI v1.0.0",
    "",
    "Type '/help' to see available commands."
  ];

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
    // Auto focus input when typing done
    if (!isTyping) {
        document.getElementById('terminal-input').focus();
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
          "  /login    - Go to login page",
          "  /join     - Go to sign up page",
          "  /guide    - Go to user guide",
          "  clear     - Clear terminal screen"
        ];
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
      { type: 'input', content: `C:\\Users\\Guest> ${cmd}` },
      ...output.map(line => ({ type: 'text', content: line }))
    ]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCommand(input);
      setInput('');
    }
  };

  return (
    <div className="terminal-hero" onClick={() => !isTyping && document.getElementById('terminal-input').focus()}>
      <div className="terminal-window">
        <div className="terminal-header">
          <div className="window-controls">
            <span className="control close"></span>
            <span className="control minimize"></span>
            <span className="control maximize"></span>
          </div>
          <div className="window-title">Command Prompt - TN CLI</div>
        </div>
        <div className="terminal-body" ref={scrollRef}>
          {history.map((line, i) => (
            <div key={i} className={`line ${line.type}`}>
               {line.content}
            </div>
          ))}
          {!isTyping && (
            <div className="input-line">
              <span className="prompt">C:\Users\Guest&gt;</span>
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
      </div>
    </div>
  );
};

export default TerminalHero;
