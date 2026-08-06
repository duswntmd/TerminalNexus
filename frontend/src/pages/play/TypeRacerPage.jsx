import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchWithAccess } from "../../util/fetchUtil";
import "./TypeRacerPage.css";

// 무작위 CLI 쉘 명령어 풀
const COMMANDS_POOL = [
  "git commit -m \"feat: add oauth2 login and security filter chains\"",
  "docker run -d -p 8080:8080 --name backend-api openjdk:17",
  "kubectl get pods -n production -o wide",
  "npm install -g create-react-app --save-dev",
  "chmod 755 gradlew && ./gradlew clean build",
  "find . -name \"*.java\" -type f | xargs grep \"TODO\"",
  "curl -X POST -H \"Content-Type: application/json\" -d '{\"username\":\"admin\"}' http://localhost:8080/api/login",
  "ssh -i ~/.ssh/id_rsa ubuntu@13.124.23.45",
  "systemctl restart nginx && tail -f /var/log/nginx/error.log",
  "git checkout -b feature/typeracer && git push origin feature/typeracer",
  "docker-compose up -d --build mysql redis",
  "grep -rnw './src' -e 'TODO'",
  "cat /var/log/syslog | grep -i error | tail -n 20",
  "tar -czvf backup.tar.gz ./src ./public",
  "sudo apt-get update && sudo apt-get upgrade -y",
  "kill -9 $(lsof -t -i:8080)",
  "aws s3 cp ./build s3://my-bucket-name --recursive",
  "ps aux | grep java | awk '{print $2}'"
];

const TypeRacerPage = () => {
  const { isLoggedIn, user } = useAuth();
  
  // 게임 상태 변수
  const [currentText, setCurrentText] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  
  // 통계 지표
  const [correctChars, setCorrectChars] = useState(0);
  const [totalTyped, setTotalTyped] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  // 리더보드 데이터
  const [leaderboard, setLeaderboard] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [myBest, setMyBest] = useState(null);
  const [myHistory, setMyHistory] = useState([]);

  // Refs
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const correctCharsRef = useRef(0);
  const totalTypedRef = useRef(0);
  const inputValueRef = useRef("");
  const currentTextRef = useRef("");

  // 초기 텍스트 및 리더보드 세팅
  useEffect(() => {
    selectRandomText();
    fetchLeaderboard();
    if (isLoggedIn) {
      fetchMyBest();
      fetchMyHistory();
    } else {
      setMyBest(null);
      setMyHistory([]);
    }
    return () => clearInterval(timerRef.current);
  }, [isLoggedIn]);

  // 개인 최고 기록 가져오기
  const fetchMyBest = async () => {
    try {
      const response = await fetchWithAccess("/api/typeracer/my-best");
      if (response.status === 200) {
        const data = await response.json();
        setMyBest(data);
      } else if (response.status === 204) {
        setMyBest(null);
      }
    } catch (error) {
      console.error("개인 최고 기록 조회 실패:", error);
    }
  };

  // 최근 타자 전적 가져오기
  const fetchMyHistory = async () => {
    try {
      const response = await fetchWithAccess("/api/typeracer/history");
      if (response.ok) {
        const data = await response.json();
        setMyHistory(data);
      }
    } catch (error) {
      console.error("최근 전적 조회 실패:", error);
    }
  };

  // 리더보드 가져오기
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch("/api/typeracer/leaderboard");
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error("리더보드 로드 실패:", error);
    }
  };

  // 무작위 명령어 선정
  const selectRandomText = () => {
    const randomIndex = Math.floor(Math.random() * COMMANDS_POOL.length);
    const text = COMMANDS_POOL[randomIndex];
    setCurrentText(text);
    currentTextRef.current = text;
    setInputValue("");
    inputValueRef.current = "";
  };

  // 입력 처리 핸들러
  const handleInputChange = (e) => {
    const value = e.target.value;
    
    // 게임 시작 처리
    if (!isStarted && !isFinished) {
      setIsStarted(true);
      startTimeRef.current = Date.now();
      startTimer();
    }

    setInputValue(value);
    inputValueRef.current = value;

    // 타이핑한 글자 수 및 정확한 글자 수 계산
    let currentCorrect = 0;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === currentText[i]) {
        currentCorrect++;
      }
    }

    // 통계치 업데이트
    const newTotalTyped = totalTyped + (value.length > inputValue.length ? 1 : 0);
    setTotalTyped(newTotalTyped);
    totalTypedRef.current = newTotalTyped;
    
    // 문장이 정확히 일치하여 완수한 경우 다음 문장으로 교체
    if (value === currentText) {
      const nextCorrectChars = correctChars + currentText.length;
      setCorrectChars(nextCorrectChars);
      correctCharsRef.current = nextCorrectChars;
      selectRandomText();
    }
  };

  // 타이머 실행
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 실시간 WPM 및 정확도 계산 효과
  useEffect(() => {
    if (isStarted && !isFinished && timeLeft < 60) {
      const elapsedMinutes = (60 - timeLeft) / 60;
      // WPM = (올바른 문자수 / 5) / 경과 시간(분)
      const currentCorrectTotal = correctChars + (inputValue.split("").filter((char, idx) => char === currentText[idx]).length);
      const calculatedWpm = Math.round((currentCorrectTotal / 5) / elapsedMinutes) || 0;
      setWpm(calculatedWpm);

      // 정확도 계산
      const currentTotalTyped = totalTyped || 1;
      const currentAccuracy = Math.round((currentCorrectTotal / currentTotalTyped) * 100);
      setAccuracy(Math.min(100, Math.max(0, currentAccuracy)));
    }
  }, [timeLeft, inputValue, correctChars, totalTyped, currentText, isStarted, isFinished]);

  // 게임 종료
  const finishGame = () => {
    setIsFinished(true);
    setIsStarted(false);
    
    // 최종 성적 산출 (Stale 클로저 문제를 해결하기 위해 ref 활용)
    const elapsedMinutes = 1.0; // 60초 완주
    const currentInputValue = inputValueRef.current;
    const currentCorrectTotal = correctCharsRef.current + (currentInputValue.split("").filter((char, idx) => char === currentTextRef.current[idx]).length);
    const finalWpm = Math.round((currentCorrectTotal / 5) / elapsedMinutes) || 0;
    setWpm(finalWpm);

    const finalAccuracy = totalTypedRef.current > 0 ? Math.round((currentCorrectTotal / totalTypedRef.current) * 100) : 100;
    setAccuracy(Math.min(100, finalAccuracy));
  };

  // 게임 재시작
  const restartGame = () => {
    clearInterval(timerRef.current);
    setIsStarted(false);
    setIsFinished(false);
    setTimeLeft(60);
    setCorrectChars(0);
    setTotalTyped(0);
    setWpm(0);
    setAccuracy(100);
    setSubmitMessage("");
    setHasSubmitted(false);
    
    // Refs 초기화
    correctCharsRef.current = 0;
    totalTypedRef.current = 0;
    inputValueRef.current = "";
    
    selectRandomText();
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 50);
  };

  // 점수 서버 등록
  const submitScore = async () => {
    if (isSubmitting || hasSubmitted) return;
    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      const response = await fetchWithAccess("/api/typeracer/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ wpm, accuracy })
      });

      const successText = await response.text();
      setSubmitMessage(successText || "랭킹 등록에 성공했습니다!");
      setHasSubmitted(true);
      fetchLeaderboard(); // 리더보드 갱신
      fetchMyBest();      // 개인 최고 기록 갱신
      fetchMyHistory();   // 최근 전적 갱신
    } catch (error) {
      console.error(error);
      let errMsg = "서버 통신 오류가 발생했습니다.";
      if (error.response) {
        try {
          const errText = await error.response.text();
          errMsg = errText || errMsg;
          if (errMsg.startsWith("{")) {
            const errObj = JSON.parse(errMsg);
            errMsg = errObj.error || errObj.message || errMsg;
          }
        } catch (_) {}
      }
      setSubmitMessage(`등록 실패: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 입력 상태 렌더링을 위한 글자 분석 배열 반환
  const renderTextCharacters = () => {
    const textChars = currentText.split("");
    return textChars.map((char, index) => {
      let className = "char-upcoming";
      if (index < inputValue.length) {
        className = inputValue[index] === char ? "char-correct" : "char-incorrect";
      } else if (index === inputValue.length) {
        className = "char-current";
      }
      return (
        <span key={index} className={className}>
          {char}
        </span>
      );
    });
  };

  return (
    <div className="typeracer-container">
      <div className="typeracer-header">
        <h1 className="typeracer-title">⌨️ CLI TypeRacer</h1>
        <p className="typeracer-subtitle">무작위 리눅스/Git 명령어를 신속하고 정확하게 입력하여 리더보드에 도전해보세요!</p>
      </div>

      <div className="typeracer-layout">
        {/* 게임 작동 패널 */}
        <div className="typeracer-game-panel">
          {!isFinished ? (
            <>
              {/* 대시보드 */}
              <div className="typeracer-dashboard">
                <div className="dashboard-item">
                  <span className="dashboard-label">Time Left</span>
                  <span className={`dashboard-value ${timeLeft <= 10 ? "char-incorrect" : ""}`}>
                    {timeLeft}s
                  </span>
                </div>
                <div className="dashboard-item">
                  <span className="dashboard-label">WPM</span>
                  <span className="dashboard-value highlight">{wpm}</span>
                </div>
                <div className="dashboard-item">
                  <span className="dashboard-label">Accuracy</span>
                  <span className="dashboard-value">{accuracy}%</span>
                </div>
                {isLoggedIn && (
                  <div className="dashboard-item">
                    <span className="dashboard-label">My Best</span>
                    <span className="dashboard-value" style={{ color: "#ffcc00", textShadow: "0 0 8px rgba(255, 204, 0, 0.5)" }}>
                      {myBest ? `${myBest.wpm} WPM` : "-"}
                    </span>
                  </div>
                )}
              </div>

              {/* 텍스트 타이핑 매치 영역 */}
              <div className="typeracer-text-display">
                {renderTextCharacters()}
              </div>

              {/* 입력란 */}
              <div className="typeracer-input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  className="typeracer-input"
                  placeholder={isStarted ? "명령어를 정확히 쳐서 통과하세요..." : "타이핑을 시작하면 카운트다운이 시작됩니다..."}
                  value={inputValue}
                  onChange={handleInputChange}
                  disabled={isFinished}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                {!isStarted && <div className="start-prompt">입력창을 클릭한 뒤 입력을 시작하세요!</div>}
              </div>
            </>
          ) : (
            /* 게임 종료 성적표 화면 */
            <div className="results-overlay">
              <h2 style={{ fontSize: "2rem", color: "#00ff66", margin: "0 0 20px 0" }}>🎮 GAME OVER</h2>
              <p style={{ color: "#8892b0", marginBottom: "30px" }}>60초 동안 타건한 최종 실력측정 결과입니다.</p>
              
              <div className="results-grid">
                <div className="dashboard-item">
                  <span className="dashboard-label">최종 속도 (WPM)</span>
                  <span className="result-stat">{wpm}</span>
                </div>
                <div className="dashboard-item">
                  <span className="dashboard-label">최종 정확도</span>
                  <span className="result-stat">{accuracy}%</span>
                </div>
                {isLoggedIn && (
                  <div className="dashboard-item">
                    <span className="dashboard-label" style={{ color: "#ffcc00" }}>내 최고 기록</span>
                    <span className="result-stat" style={{ color: "#ffcc00", textShadow: "0 0 10px rgba(255, 204, 0, 0.5)" }}>
                      {myBest ? `${myBest.wpm} WPM` : "-"}
                    </span>
                  </div>
                )}
              </div>

              {submitMessage && (
                <div style={{
                  color: submitMessage.includes("성공") || submitMessage.includes("경신") || submitMessage.includes("축하") ? "#00ff66" : "#ff3366",
                  margin: "15px 0",
                  fontWeight: "bold"
                }}>
                  {submitMessage}
                </div>
              )}

              <div className="result-actions">
                <button className="btn-secondary" onClick={restartGame}>
                  다시 도전하기
                </button>

                {isLoggedIn ? (
                  <button 
                    className="btn-primary" 
                    onClick={submitScore} 
                    disabled={isSubmitting || hasSubmitted}
                  >
                    {isSubmitting ? "등록 중..." : hasSubmitted ? "등록 완료" : "내 랭킹 등록"}
                  </button>
                ) : (
                  <button className="btn-primary" disabled>
                    랭킹 등록 (로그인 필요)
                  </button>
                )}
              </div>

              {!isLoggedIn && (
                <div className="guest-info-banner">
                  💡 비회원은 점수 등록이 불가능합니다. <Link to="/login" style={{ color: "#ffcc00", textDecoration: "underline" }}>로그인</Link> 또는 <Link to="/join" style={{ color: "#ffcc00", textDecoration: "underline" }}>회원가입</Link> 후 랭킹에 도전해 보세요!
                </div>
              )}
            </div>
          )}
        </div>

        {/* 우측 리더보드 패널 */}
        <div className="typeracer-leaderboard" style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
          <div>
            <h2 className="leaderboard-title">🏆 실시간 Top 10 리더보드</h2>
            
            {leaderboard.length > 0 ? (
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th className="rank-col">Rank</th>
                    <th>User</th>
                    <th style={{ textAlign: "right" }}>WPM</th>
                    <th style={{ textAlign: "right" }}>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((item, idx) => {
                    const isCurrentUser = user && user.nickname === item.nickname;
                    return (
                      <tr key={idx} className={`leaderboard-row ${isCurrentUser ? "current-user-row" : ""}`}>
                        <td className={`rank-col rank-${item.rank}`}>
                          {item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : item.rank}
                        </td>
                        <td className="nickname-col" title={item.nickname} style={{ fontWeight: isCurrentUser ? "bold" : "normal", color: isCurrentUser ? "#00ff66" : "inherit" }}>
                          {item.nickname} {isCurrentUser && " (나)"}
                        </td>
                        <td className="wpm-col" style={{ textAlign: "right", fontWeight: isCurrentUser ? "bold" : "normal" }}>
                          {item.wpm}
                        </td>
                        <td className="accuracy-col" style={{ textAlign: "right", fontWeight: isCurrentUser ? "bold" : "normal" }}>
                          {item.accuracy}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-leaderboard">
                현재 기록된 랭킹 정보가 없습니다.<br />첫 번째 랭커에 도전해보세요!
              </div>
            )}
          </div>

          {/* 나의 최근 5게임 전적 */}
          {isLoggedIn && (
            <div style={{ borderTop: "1px dashed rgba(0, 255, 102, 0.2)", paddingTop: "20px" }}>
              <h2 className="leaderboard-title" style={{ fontSize: "1.3rem", color: "#ffcc00", borderBottom: "none", paddingBottom: "0", display: "flex", alignItems: "center", gap: "10px" }}>
                📊 나의 최근 5게임 전적
              </h2>
              {myHistory.length > 0 ? (
                <table className="leaderboard-table" style={{ fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th style={{ color: "#ffcc00", borderBottom: "1px solid rgba(255, 204, 0, 0.2)" }}>날짜</th>
                      <th style={{ textAlign: "right", color: "#ffcc00", borderBottom: "1px solid rgba(255, 204, 0, 0.2)" }}>WPM</th>
                      <th style={{ textAlign: "right", color: "#ffcc00", borderBottom: "1px solid rgba(255, 204, 0, 0.2)" }}>정확도</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myHistory.map((item, idx) => {
                      let dateStr = "-";
                      if (item.updatedDate) {
                        const date = new Date(item.updatedDate);
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        dateStr = `${month}-${day} ${hours}:${minutes}`;
                      }
                      return (
                        <tr key={idx} className="leaderboard-row">
                          <td style={{ color: "#8892b0" }}>{dateStr}</td>
                          <td style={{ textAlign: "right", fontWeight: "bold", color: "#00ff66" }}>{item.wpm}</td>
                          <td style={{ textAlign: "right", color: "#ffffff" }}>{item.accuracy}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="empty-leaderboard" style={{ fontSize: "0.85rem", padding: "15px 0" }}>
                  아직 플레이한 기록이 없습니다.<br />게임 완료 후 점수를 등록해 보세요!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TypeRacerPage;
