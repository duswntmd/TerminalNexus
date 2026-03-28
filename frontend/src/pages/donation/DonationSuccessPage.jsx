import { useLocation, useNavigate } from "react-router-dom";

const PAY_METHOD_LABEL = {
  card: "신용/체크카드",
  kakaopay: "카카오페이",
  tosspay: "토스페이",
  naverpay: "네이버페이",
};

export default function DonationSuccessPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const amount = state?.amount;
  const payMethod = PAY_METHOD_LABEL[state?.payMethod] || state?.payMethod || "결제";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* 성공 아이콘 */}
        <div style={styles.iconWrapper}>
          <div style={styles.checkCircle}>✓</div>
        </div>

        <h1 style={styles.title}>후원 완료! 💝</h1>
        <p style={styles.subtitle}>소중한 후원에 진심으로 감사드립니다.</p>

        {/* 결제 상세 */}
        <div style={styles.detailBox}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>후원 금액</span>
            <span style={styles.detailValue}>
              <strong style={{ color: "#6c63ff", fontSize: "20px" }}>
                {amount?.toLocaleString()}원
              </strong>
            </span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>결제 수단</span>
            <span style={styles.detailValue}>{payMethod}</span>
          </div>
        </div>

        <p style={styles.message}>
          🚀 후원금은 TerminalNexus 서버 운영 및 새로운 기능 개발에 사용됩니다.
        </p>

        {/* 버튼 */}
        <div style={styles.btnGroup}>
          <button onClick={() => navigate("/")} style={styles.primaryBtn}>
            메인으로 돌아가기
          </button>
          <button onClick={() => navigate("/donation/history")} style={styles.secondaryBtn}>
            후원 내역 확인
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "24px",
    padding: "48px 36px",
    width: "100%",
    maxWidth: "480px",
    textAlign: "center",
    boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
  },
  iconWrapper: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "24px",
  },
  checkCircle: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6c63ff, #4facfe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "36px",
    color: "#fff",
    fontWeight: "bold",
    boxShadow: "0 8px 30px rgba(108,99,255,0.5)",
  },
  title: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#fff",
    margin: "0 0 10px",
  },
  subtitle: {
    fontSize: "16px",
    color: "rgba(255,255,255,0.6)",
    marginBottom: "32px",
  },
  detailBox: {
    background: "rgba(255,255,255,0.07)",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "24px",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  detailLabel: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.5)",
  },
  detailValue: {
    fontSize: "15px",
    color: "#fff",
    fontWeight: "600",
  },
  message: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.5)",
    lineHeight: "1.6",
    marginBottom: "32px",
  },
  btnGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  primaryBtn: {
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #6c63ff, #4facfe)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent",
    color: "rgba(255,255,255,0.7)",
    fontSize: "15px",
    cursor: "pointer",
  },
};
