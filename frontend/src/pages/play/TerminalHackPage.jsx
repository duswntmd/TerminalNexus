import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./TerminalHackPage.css";

// 1. 난이도별 단어 세트
const WORD_SETS = {
  easy: [
    "ABOUT", "ALERT", "BOARD", "CLEAR", "CLOSE", "ENTER",
    "INDEX", "LOGIN", "MODEM", "PHASE", "RESET", "ROUTE",
    "SHELL", "STACK", "START", "WRITE", "LOGIC", "PANEL"
  ],
  medium: [
    "CHANNEL", "COMMAND", "COMPILE", "CONSOLE", "DESKTOP",
    "DYNAMIC", "GATEWAY", "HACKING", "MONITOR", "NETWORK",
    "PLAYING", "ROUTING", "SANDBOX", "STORAGE", "VERSION",
    "RECORDS", "UPGRADE", "UTILITY"
  ],
  hard: [
    "ALGORITHM", "AUTHENTIC", "DATABASED", "DIRECTORY", "EXCEPTION",
    "INTERFACE", "LOCALIZED", "MULTITASK", "PRACTICAL", "RECURSIVE",
    "SENSITIVE", "STRUCTURE", "SUBMODULE", "VARIABLES", "WEBSOCKET",
    "ENCRYPTION", "CONNECTION"
  ]
};

const BRACKETS = [
  { open: "[", close: "]" },
  { open: "{", close: "}" },
  { open: "<", close: ">" },
  { open: "(", close: ")" }
];

const SPECIAL_CHARS = "!@#$%^&*()_+{}|[]\\:;\"'<>,.?/~`".split("");

const TerminalHackPage = () => {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState("easy");
  const [attempts, setAttempts] = useState(4);
  const [gameState, setGameState] = useState("PLAYING"); // PLAYING, SUCCESS, LOCKOUT
  const [secretWord, setSecretWord] = useState("");
  const [words, setWords] = useState([]);
  const [removedDuds, setRemovedDuds] = useState(new Set()); // 제거된 오답 단어 인덱스
  const [usedBrackets, setUsedBrackets] = useState(new Set()); // 사용된 괄호쌍 ID
  const [log, setLog] = useState([]);
  
  // 384글자 평탄화 보드 리스트
  const [boardChars, setBoardChars] = useState([]);
  // 마우스 호버 인덱스 추적
  const [hoveredIndices, setHoveredIndices] = useState([]);
  const [selectedElementInfo, setSelectedElementInfo] = useState("");

  const consoleEndRef = useRef(null);
  const audioCtxRef = useRef(null);

  // 사운드 재생 편의 함수
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  const playBeep = (freq, duration, type = "sine", volume = 0.1) => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context blocked or not supported:", e);
    }
  };

  const playClickSound = () => playBeep(880, 0.05, "sine", 0.08);
  const playHoverSound = () => playBeep(1200, 0.02, "sine", 0.03);
  const playSuccessSound = () => {
    playBeep(523.25, 0.1); // C5
    setTimeout(() => playBeep(659.25, 0.1), 100); // E5
    setTimeout(() => playBeep(783.99, 0.1), 200); // G5
    setTimeout(() => playBeep(1046.50, 0.3), 300); // C6
  };
  const playDeniedSound = () => {
    playBeep(180, 0.4, "sawtooth", 0.15);
  };
  const playBonusSound = () => {
    playBeep(440, 0.15, "triangle", 0.1);
    setTimeout(() => playBeep(880, 0.25, "triangle", 0.1), 150);
  };

  // 게임 시작 및 보드 초기화
  useEffect(() => {
    startNewGame();
  }, [difficulty]);

  // 로그 스크롤 자동화
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [log]);

  const startNewGame = () => {
    const wordList = [...WORD_SETS[difficulty]];
    // 무작위로 12개 선택
    const chosenWords = [];
    const tempWords = [...wordList];
    const wordsCount = 12;
    for (let i = 0; i < wordsCount && tempWords.length > 0; i++) {
      const randIdx = Math.floor(Math.random() * tempWords.length);
      chosenWords.push(tempWords.splice(randIdx, 1)[0].toUpperCase());
    }

    const targetWord = chosenWords[Math.floor(Math.random() * chosenWords.length)];
    setSecretWord(targetWord);
    setWords(chosenWords);
    setAttempts(4);
    setGameState("PLAYING");
    setRemovedDuds(new Set());
    setUsedBrackets(new Set());
    
    // 로그 초기화
    setLog([
      `> TN-OS v2.4 BOOTING...`,
      `> ENTERING PRIVATE SUBNET`,
      `> LOGGING ATTEMPTS LEFT: 4`,
      `> CHOOSE PASSCODE...`
    ]);

    // 보드 캐릭터 배열 설계
    generateBoard(chosenWords);
  };

  // 보드 문자열 스트림 생성
  const generateBoard = (chosenWords) => {
    const totalLength = 384; // 12글자 * 32줄
    const tempChars = Array(totalLength).fill(null);

    // 1. 단어들 임의 오프셋 배치
    const wordLength = chosenWords[0].length;
    // 오프셋 겹치지 않게 안전하게 배치
    let placedCount = 0;
    while (placedCount < chosenWords.length) {
      // 12글자 로우를 침범하지 않는 최소한의 간격 유지
      const randIdx = Math.floor(Math.random() * (totalLength - wordLength));
      
      // 단어가 세로 줄 바꿈 경계에 걸쳐 분열되지 않도록 검사
      const rowStart = Math.floor(randIdx / 12);
      const rowEnd = Math.floor((randIdx + wordLength - 1) / 12);
      
      if (rowStart !== rowEnd) continue; // 다른 줄에 걸쳐 있으면 무효

      // 겹침 여부 확인
      let hasConflict = false;
      for (let i = 0; i < wordLength; i++) {
        if (tempChars[randIdx + i] !== null) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        // 단어 세팅
        const word = chosenWords[placedCount];
        for (let i = 0; i < wordLength; i++) {
          tempChars[randIdx + i] = {
            char: word[i],
            isWord: true,
            wordIndex: placedCount,
            wordText: word
          };
        }
        placedCount++;
      }
    }

    // 2. 남은 자리를 특수 기호로 채우기
    for (let i = 0; i < totalLength; i++) {
      if (tempChars[i] === null) {
        const randSpecial = SPECIAL_CHARS[Math.floor(Math.random() * SPECIAL_CHARS.length)];
        tempChars[i] = {
          char: randSpecial,
          isWord: false
        };
      }
    }

    // 3. 각 줄(Row) 마다 괄호쌍 찾기 (이스터에그 매핑)
    // 12글자 단위로 순회
    let bracketIdCounter = 1;
    const bracketBonusList = [];

    for (let row = 0; row < 32; row++) {
      const rowStartIdx = row * 12;
      const rowEndIdx = rowStartIdx + 12;
      
      // 한 줄 안에서 괄호쌍 탐색
      for (let i = rowStartIdx; i < rowEndIdx; i++) {
        const charObj = tempChars[i];
        if (charObj.isWord) continue;

        // 매칭되는 괄호 타입 찾기
        const bracketType = BRACKETS.find(b => b.open === charObj.char);
        if (bracketType) {
          // 닫히는 괄호 탐색 (우측 방향으로)
          for (let j = i + 1; j < rowEndIdx; j++) {
            const nextCharObj = tempChars[j];
            if (nextCharObj.isWord) break; // 중간에 단어가 끼어 있으면 무효화

            if (nextCharObj.char === bracketType.close) {
              // 유효한 괄호쌍 발견!
              const bracketId = bracketIdCounter++;
              // 괄호 범위 내의 모든 캐릭터에 속성 매핑
              for (let k = i; k <= j; k++) {
                tempChars[k].isBracket = true;
                tempChars[k].bracketId = bracketId;
                tempChars[k].bracketStart = i;
                tempChars[k].bracketEnd = j;
              }
              break; // 가장 바깥쪽 괄호 하나만 한 번 매칭하고 넘김
            }
          }
        }
      }
    }

    setBoardChars(tempChars);
  };

  // 마우스 호버 시 동일 단어/괄호 전체 하이라이트 계산
  const handleMouseEnter = (index) => {
    const charObj = boardChars[index];
    if (!charObj) return;

    playHoverSound();

    if (charObj.isWord) {
      // 해당 단어가 삭제된 더드인지 확인
      if (removedDuds.has(charObj.wordIndex)) {
        setHoveredIndices([index]);
        setSelectedElementInfo(charObj.char);
        return;
      }
      // 같은 단어에 속한 모든 인덱스 수집
      const indices = [];
      boardChars.forEach((c, idx) => {
        if (c.isWord && c.wordIndex === charObj.wordIndex) {
          indices.push(idx);
        }
      });
      setHoveredIndices(indices);
      setSelectedElementInfo(charObj.wordText);
    } else if (charObj.isBracket && !usedBrackets.has(charObj.bracketId)) {
      // 사용하지 않은 괄호쌍 하이라이트
      const indices = [];
      for (let k = charObj.bracketStart; k <= charObj.bracketEnd; k++) {
        indices.push(k);
      }
      setHoveredIndices(indices);
      // 괄호 텍스트 구성
      const bracketStr = indices.map(idx => boardChars[idx].char).join("");
      setSelectedElementInfo(bracketStr);
    } else {
      // 일반 특수 문자
      setHoveredIndices([index]);
      setSelectedElementInfo(charObj.char);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndices([]);
    setSelectedElementInfo("");
  };

  // 요소 클릭 시 처리
  const handleClick = (index) => {
    if (gameState !== "PLAYING") return;

    const charObj = boardChars[index];
    if (!charObj) return;

    playClickSound();

    if (charObj.isWord) {
      // 제거된 Dud(오답) 단어인 경우 무시
      if (removedDuds.has(charObj.wordIndex)) {
        return;
      }

      const selectedWord = charObj.wordText;
      
      // 1. 정답인 경우
      if (selectedWord === secretWord) {
        playSuccessSound();
        setGameState("SUCCESS");
        setLog(prev => [
          ...prev,
          `> SELECTING "${selectedWord}"`,
          `> MATCH ENCRYPTED KEY [OK]`,
          `> ACCESS GRANTED! WELCOME BACK.`
        ]);
        return;
      }

      // 2. 오답인 경우
      const sim = calculateSimilarity(selectedWord, secretWord);
      const newAttempts = attempts - 1;
      setAttempts(newAttempts);

      setLog(prev => [
        ...prev,
        `> SELECTING "${selectedWord}"`,
        `> ACCESS DENIED.`,
        `> SIMILARITY=${sim}/${secretWord.length}`
      ]);

      if (newAttempts <= 0) {
        playDeniedSound();
        setGameState("LOCKOUT");
        setLog(prev => [
          ...prev,
          `> !!! SYSTEM TERMINAL LOCKED OUT !!!`,
          `> COLD REBOOT REQUIRED.`
        ]);
      }
    } else if (charObj.isBracket && !usedBrackets.has(charObj.bracketId)) {
      // 괄호 이스터에그 보너스 발동
      const bracketId = charObj.bracketId;
      setUsedBrackets(prev => {
        const next = new Set(prev);
        next.add(bracketId);
        return next;
      });

      // 50% 확률로 기회 보충 or 오답 제거
      const isReplenish = Math.random() > 0.5;

      if (isReplenish) {
        setAttempts(4);
        playBonusSound();
        setLog(prev => [
          ...prev,
          `> BRACKET MODEM BYPASS...`,
          `> ATTEMPTS REPLENISHED.`,
        ]);
      } else {
        // 제거 가능한 오답 단어 필터링 (정답 제외, 이미 제거된 오답 제외)
        const activeDudIndices = [];
        words.forEach((w, idx) => {
          if (w !== secretWord && !removedDuds.has(idx)) {
            activeDudIndices.push(idx);
          }
        });

        if (activeDudIndices.length > 0) {
          const randDudIdx = activeDudIndices[Math.floor(Math.random() * activeDudIndices.length)];
          setRemovedDuds(prev => {
            const next = new Set(prev);
            next.add(randDudIdx);
            return next;
          });
          playBonusSound();
          setLog(prev => [
            ...prev,
            `> BRACKET DUD DISMANTLE...`,
            `> DUD "${words[randDudIdx]}" REMOVED.`,
          ]);
        } else {
          // 지울 오답이 없으면 기회 충전으로 우회
          setAttempts(4);
          playBonusSound();
          setLog(prev => [
            ...prev,
            `> BRACKET MODEM BYPASS...`,
            `> ATTEMPTS REPLENISHED.`,
          ]);
        }
      }
      
      // 괄호는 사용한 것으로 마킹되므로 호버 효과 해제
      setHoveredIndices([]);
    }
  };

  // 일치하는 글자 수 (자리수와 단어가 완벽히 일치해야 함)
  const calculateSimilarity = (wordA, wordB) => {
    let count = 0;
    const len = Math.min(wordA.length, wordB.length);
    for (let i = 0; i < len; i++) {
      if (wordA[i] === wordB[i]) {
        count++;
      }
    }
    return count;
  };

  // 가상의 16진수 주소 라벨 생성
  const getHexAddress = (rowNum) => {
    const base = 0xF3A4 + (rowNum * 12);
    return "0x" + base.toString(16).toUpperCase();
  };

  // 12글자 단위로 잘라낸 줄 렌더러
  const renderRow = (rowNum) => {
    const rowStart = rowNum * 12;
    const elements = [];

    for (let i = 0; i < 12; i++) {
      const boardIdx = rowStart + i;
      const charObj = boardChars[boardIdx];
      if (!charObj) continue;

      const isHovered = hoveredIndices.includes(boardIdx);
      const isDudRemoved = charObj.isWord && removedDuds.has(charObj.wordIndex);
      const isBracketUsed = charObj.isBracket && usedBrackets.has(charObj.bracketId);

      // 출력할 문자
      let displayChar = charObj.char;
      if (isDudRemoved) {
        displayChar = "."; // 오답 제거 시 온점으로 대체
      }

      // CSS 클래스 매핑
      let classNames = "char-span";
      if (isHovered) classNames += " highlighted";

      elements.push(
        <span
          key={i}
          className={classNames}
          onMouseEnter={() => handleMouseEnter(boardIdx)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleClick(boardIdx)}
          style={{
            color: isDudRemoved ? "#1a5c1a" : (isBracketUsed ? "#1a5c1a" : undefined)
          }}
        >
          {displayChar}
        </span>
      );
    }

    return (
      <div className="matrix-row" key={rowNum}>
        <span className="hex-address">{getHexAddress(rowNum)}</span>
        <span className="char-container">{elements}</span>
      </div>
    );
  };

  return (
    <div className="terminal-hack-wrapper">
      <div className="difficulty-selector">
        <button
          className={`diff-btn ${difficulty === "easy" ? "active" : ""}`}
          onClick={() => { playClickSound(); setDifficulty("easy"); }}
        >
          EASY (5L)
        </button>
        <button
          className={`diff-btn ${difficulty === "medium" ? "active" : ""}`}
          onClick={() => { playClickSound(); setDifficulty("medium"); }}
        >
          MEDIUM (7L)
        </button>
        <button
          className={`diff-btn ${difficulty === "hard" ? "active" : ""}`}
          onClick={() => { playClickSound(); setDifficulty("hard"); }}
        >
          HARD (9L)
        </button>
      </div>

      <div className="crt-screen">
        <div className="crt-screen-inner">
          
          {/* 게임 헤더 */}
          <div className="hack-header">
            <div className="hack-title">📟 TERMINAL SECURITY PROTOCOL</div>
            <div className="hack-attempts">
              <span>{t("attempts", "ATTEMPTS REMAINING:")}</span>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`attempt-indicator ${i >= attempts ? "spent" : ""}`}
                />
              ))}
            </div>
          </div>

          {gameState === "PLAYING" ? (
            <div className="hack-body">
              {/* 좌측 32개 줄 (2개 열로 나누어 출력) */}
              <div className="word-matrix">
                <div className="matrix-column">
                  {Array.from({ length: 16 }).map((_, i) => renderRow(i))}
                </div>
                <div className="matrix-column">
                  {Array.from({ length: 16 }).map((_, i) => renderRow(i + 16))}
                </div>
              </div>

              {/* 우측 진행 로그 및 호버 단어 피드백 */}
              <div className="console-log">
                {log.map((line, idx) => (
                  <div
                    key={idx}
                    className={`log-entry ${
                      line.includes("REMOVED") ? "dud" :
                      line.includes("REPLENISHED") ? "replenish" :
                      line.includes("DENIED") || line.includes("LOCKED OUT") ? "error" :
                      line.includes("GRANTED") ? "success" : ""
                    }`}
                  >
                    {line}
                  </div>
                ))}
                
                {/* 호버 중인 정보 출력 */}
                {selectedElementInfo && (
                  <div className="log-entry hover-preview" style={{ marginTop: "auto", borderTop: "1px dashed #1a5c1a", paddingTop: "10px" }}>
                    {`> LINK: ${selectedElementInfo}`}
                  </div>
                )}
                <div ref={consoleEndRef} />
              </div>
            </div>
          ) : (
            /* 성공 / 실패 락아웃 오버레이 */
            <div className="game-overlay">
              {gameState === "SUCCESS" ? (
                <>
                  <div className="overlay-title success">ACCESS GRANTED</div>
                  <p>{t("hack_success_desc", "보안 프로토콜을 통과했습니다. 시스템 코어 권한이 허용되었습니다.")}</p>
                  <button className="reset-btn" onClick={() => { playClickSound(); startNewGame(); }}>
                    {t("play_again", "NEW TERMINAL ACCESS")}
                  </button>
                </>
              ) : (
                <>
                  <div className="overlay-title denied">TERMINAL LOCKED OUT</div>
                  <p>{t("hack_lockout_desc", "인증 횟수를 모두 초과했습니다. 시스템 강제 잠금 상태가 활성화되었습니다.")}</p>
                  <button className="reset-btn denied-btn" onClick={() => { playClickSound(); startNewGame(); }}>
                    {t("reboot_system", "FORCE SYSTEM REBOOT")}
                  </button>
                </>
              )}
            </div>
          )}

          {/* 하단 단축키 & 이용법 */}
          <div className="hack-footer">
            [HELP] {t("hack_help", "단어 중 비밀번호를 추측하세요. 괄호쌍 {...}, [...], <...>, (...)을 클릭해 오답을 제거하거나 기회를 충전할 수 있습니다.")}
          </div>

        </div>
      </div>
    </div>
  );
};

export default TerminalHackPage;
