import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchWithAccess } from "../../util/fetchUtil";

// ─── 포트원 v1 SDK 스크립트 동적 로딩 ───────────────────────────────────────
function usePortOneScript() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (document.querySelector('script[src*="iamport"]')) {
      setLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.iamport.kr/js/iamport.payment-1.2.0.js";
    script.async = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
    return () => {
      // 언마운트 시 제거하지 않음 (다른 페이지에서도 재사용)
    };
  }, []);
  return loaded;
}

// ─── 금액 프리셋 ──────────────────────────────────────────────────────────────
const AMOUNT_PRESETS = [1000, 3000, 5000, 10000, 30000, 50000];

// ─── PG사 옵션 ────────────────────────────────────────────────────────────────
// 포트원 채널 관리에서 추가한 PG사와 일치해야 함
const PG_OPTIONS = [
  { value: "kakaopay", label: "카카오페이", emoji: "💛" },
  { value: "html5_inicis", label: "신용/체크카드", emoji: "💳" },
  { value: "tosspay", label: "토스페이", emoji: "💙" },
  { value: "naverpay", label: "네이버페이", emoji: "💚" },
];

export default function DonationPage() {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const scriptLoaded = usePortOneScript();

  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedPg, setSelectedPg] = useState("kakaopay");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // 실제 결제 금액 (프리셋 or 직접입력)
  const finalAmount = selectedAmount ?? (customAmount ? parseInt(customAmount, 10) : null);

  // ─── 후원 버튼 클릭 핸들러 ────────────────────────────────────────────────
  const handleDonate = async () => {
    if (!isLoggedIn) {
      alert("로그인 후 후원이 가능합니다.");
      navigate("/login");
      return;
    }
    if (!finalAmount || finalAmount < 100) {
      alert("100원 이상의 금액을 선택해주세요.");
      return;
    }
    if (finalAmount > 1_000_000) {
      alert("최대 100만원까지 후원 가능합니다.");
      return;
    }
    if (!scriptLoaded || !window.IMP) {
      alert("결제 모듈 로딩 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    // 주문번호 생성: donation_타임스탬프_랜덤4자리
    const merchantUid = `donation_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    setLoading(true);

    try {
      // ── Step 1: 백엔드에 사전 등록 (위변조 방지용) ──────────────────────
      await fetchWithAccess("/api/donation/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantUid, amount: finalAmount, message }),
      });

      // ── Step 2: 포트원 결제창 호출 ──────────────────────────────────────
      const { IMP } = window;
      // 🔑 여기에 포트원 가맹점 식별코드 입력! (imp_XXXXXXXX 형태)
      IMP.init(import.meta.env.VITE_PORTONE_IMP_CODE || "imp00000000");

      IMP.request_pay(
        {
          pg: selectedPg,                    // PG사 선택
          pay_method: selectedPg === "html5_inicis" ? "card" : selectedPg,
          merchant_uid: merchantUid,         // 가맹점 주문번호
          name: "TerminalNexus 후원",        // 결제창에 표시될 이름
          amount: finalAmount,               // 결제 금액
          buyer_name: user?.nickname || user?.username || "",
          buyer_email: user?.email || "",
        },
        async (response) => {
          if (response.success) {
            // ── Step 3: 백엔드 서버 검증 ──────────────────────────────────
            try {
              const res = await fetchWithAccess("/api/donation/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  impUid: response.imp_uid,
                  merchantUid: response.merchant_uid,
                }),
              });
              const result = await res.json();
              navigate("/donation/success", {
                state: {
                  amount: result.amount,
                  payMethod: result.payMethod,
                  paidDate: result.paidDate,
                },
              });
            } catch (err) {
              // 서버 에러 응답에서 실제 메시지 추출
              let errMsg = "서버 검증 중 오류가 발생했습니다.";
              try {
                const errData = await err.response?.json?.();
                if (errData?.message) errMsg = errData.message;
              } catch {}
              alert("검증 실패: " + errMsg);
            }
          } else {
            alert(`결제 실패: ${response.error_msg}`);
          }
          setLoading(false);
        }
      );
    } catch (err) {
      alert("결제 준비 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* 헤더 */}
      <div style={styles.header}>
        <div style={styles.heartIcon}>💝</div>
        <h1 style={styles.title}>TerminalNexus 후원하기</h1>
        <p style={styles.subtitle}>
          후원금은 서버 운영비와 서비스 개선에 사용됩니다 🙏
        </p>
      </div>

      <div style={styles.card}>
        {/* 금액 선택 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>💰 후원 금액</h2>
          <div style={styles.presetGrid}>
            {AMOUNT_PRESETS.map((amount) => (
              <button
                key={amount}
                onClick={() => { setSelectedAmount(amount); setCustomAmount(""); }}
                style={{
                  ...styles.presetBtn,
                  ...(selectedAmount === amount ? styles.presetBtnActive : {}),
                }}
              >
                {amount.toLocaleString()}원
              </button>
            ))}
          </div>
          <div style={styles.customRow}>
            <input
              type="number"
              placeholder="직접 입력 (원)"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
              style={styles.customInput}
              min={100}
              max={1000000}
            />
          </div>
          {finalAmount && (
            <p style={styles.selectedAmount}>
              선택된 금액:{" "}
              <strong style={{ color: "#6c63ff" }}>
                {finalAmount.toLocaleString()}원
              </strong>
            </p>
          )}
        </section>

        {/* PG사 선택 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>💳 결제 수단</h2>
          <div style={styles.pgGrid}>
            {PG_OPTIONS.map((pg) => (
              <button
                key={pg.value}
                onClick={() => setSelectedPg(pg.value)}
                style={{
                  ...styles.pgBtn,
                  ...(selectedPg === pg.value ? styles.pgBtnActive : {}),
                }}
              >
                <span style={styles.pgEmoji}>{pg.emoji}</span>
                <span style={styles.pgLabel}>{pg.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 후원 메시지 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>💬 후원 메시지 (선택)</h2>
          <textarea
            placeholder="응원 메시지를 남겨주세요 (선택사항)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={200}
            style={styles.messageInput}
          />
          <p style={styles.charCount}>{message.length}/200</p>
        </section>

        {/* 후원 버튼 */}
        <button
          onClick={handleDonate}
          disabled={loading || !finalAmount}
          style={{
            ...styles.donateBtn,
            ...(loading || !finalAmount ? styles.donateBtnDisabled : {}),
          }}
        >
          {loading
            ? "결제 진행 중... 🔄"
            : finalAmount
            ? `${finalAmount.toLocaleString()}원 후원하기 💝`
            : "금액을 선택해주세요"}
        </button>

        <p style={styles.notice}>
          🔒 결제 정보는 포트원(PG)을 통해 안전하게 처리됩니다
        </p>
      </div>

      {/* 후원 현황 미리보기 버튼 */}
      <button
        onClick={() => navigate("/donation/history")}
        style={styles.historyBtn}
      >
        📋 후원 현황 보기
      </button>
    </div>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    padding: "40px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "'Inter', 'Pretendard', sans-serif",
  },
  header: {
    textAlign: "center",
    marginBottom: "32px",
  },
  heartIcon: {
    fontSize: "64px",
    marginBottom: "12px",
    animation: "pulse 2s infinite",
  },
  title: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#fff",
    margin: "0 0 12px 0",
    background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "16px",
    color: "rgba(255,255,255,0.7)",
    margin: 0,
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "24px",
    padding: "36px",
    width: "100%",
    maxWidth: "560px",
    boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
  },
  section: {
    marginBottom: "28px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    marginBottom: "14px",
  },
  presetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginBottom: "12px",
  },
  presetBtn: {
    padding: "12px 8px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.8)",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  presetBtnActive: {
    background: "linear-gradient(135deg, #6c63ff, #4facfe)",
    border: "1px solid transparent",
    color: "#fff",
    boxShadow: "0 4px 15px rgba(108,99,255,0.4)",
    transform: "translateY(-2px)",
  },
  customRow: {
    marginTop: "10px",
  },
  customInput: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
  },
  selectedAmount: {
    marginTop: "10px",
    fontSize: "14px",
    color: "rgba(255,255,255,0.7)",
  },
  pgGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "10px",
  },
  pgBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    padding: "16px 8px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  pgBtnActive: {
    background: "rgba(108,99,255,0.25)",
    border: "1px solid #6c63ff",
    boxShadow: "0 4px 15px rgba(108,99,255,0.3)",
  },
  pgEmoji: {
    fontSize: "28px",
  },
  pgLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  messageInput: {
    width: "100%",
    minHeight: "90px",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
  },
  charCount: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.4)",
    textAlign: "right",
    marginTop: "4px",
  },
  donateBtn: {
    width: "100%",
    padding: "18px",
    borderRadius: "16px",
    border: "none",
    background: "linear-gradient(135deg, #6c63ff, #4facfe)",
    color: "#fff",
    fontSize: "18px",
    fontWeight: "800",
    cursor: "pointer",
    transition: "all 0.3s",
    boxShadow: "0 8px 25px rgba(108,99,255,0.4)",
    letterSpacing: "0.5px",
  },
  donateBtnDisabled: {
    background: "rgba(255,255,255,0.1)",
    boxShadow: "none",
    cursor: "not-allowed",
    color: "rgba(255,255,255,0.3)",
  },
  notice: {
    textAlign: "center",
    fontSize: "12px",
    color: "rgba(255,255,255,0.4)",
    marginTop: "16px",
  },
  historyBtn: {
    marginTop: "20px",
    padding: "12px 24px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent",
    color: "rgba(255,255,255,0.7)",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
};
