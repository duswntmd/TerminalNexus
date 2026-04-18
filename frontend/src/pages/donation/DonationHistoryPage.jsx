import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAccess } from "../../util/fetchUtil";

const STATUS_LABEL = {
  READY: { text: "대기중", color: "#f59e0b" },
  PAID: { text: "완료", color: "#10b981" },
  FAILED: { text: "실패", color: "#ef4444" },
  CANCELLED: { text: "취소", color: "#6b7280" },
};

const PAY_METHOD_LABEL = {
  card: "💳 카드",
  kakaopay: "💛 카카오페이",
  tosspay: "💙 토스페이",
  naverpay: "💚 네이버페이",
};

export default function DonationHistoryPage() {
  const navigate = useNavigate();
  const [myHistory, setMyHistory] = useState([]);
  const [publicHistory, setPublicHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("public"); // "public" | "my"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 공개 후원 현황 (비로그인도 조회 가능)
        const publicRes = await fetch("/api/donation/public");
        const publicData = await publicRes.json();
        setPublicHistory(publicData);

        // 내 후원 내역 (로그인 유저만)
        try {
          const myRes = await fetchWithAccess("/api/donation/my");
          const myData = await myRes.json();
          setMyHistory(myData);
        } catch {
          // 비로그인 상태면 무시
        }
      } catch (err) {
        console.error("후원 내역 조회 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const displayList = activeTab === "public" ? publicHistory : myHistory;

  // 전체 후원 총액 계산
  const totalAmount = publicHistory.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div style={styles.page}>
      {/* 헤더 */}
      <div style={styles.header}>
        <h1 style={styles.title}>💝 후원 현황</h1>
        <p style={styles.subtitle}>TerminalNexus를 함께 만들어가는 분들</p>

        {/* 총 후원 금액 */}
        <div style={styles.totalCard}>
          <p style={styles.totalLabel}>총 후원 금액</p>
          <p style={styles.totalAmount}>
            {totalAmount.toLocaleString()}
            <span style={styles.totalAmountUnit}>원</span>
          </p>
          <p style={styles.totalCount}>{publicHistory.length}명이 후원했습니다 🎉</p>
        </div>
      </div>

      {/* 후원하기 버튼 */}
      <button
        onClick={() => navigate("/donation")}
        style={styles.donateBtn}
      >
        💝 나도 후원하기
      </button>

      {/* 탭 */}
      <div style={styles.tabGroup}>
        <button
          onClick={() => setActiveTab("public")}
          style={{ ...styles.tab, ...(activeTab === "public" ? styles.tabActive : {}) }}
        >
          🌍 전체 후원 현황
        </button>
        <button
          onClick={() => setActiveTab("my")}
          style={{ ...styles.tab, ...(activeTab === "my" ? styles.tabActive : {}) }}
        >
          🙋 내 후원 내역
        </button>
      </div>

      {/* 목록 */}
      <div style={styles.listContainer}>
        {loading ? (
          <p style={styles.emptyText}>불러오는 중...</p>
        ) : displayList.length === 0 ? (
          <div style={styles.emptyBox}>
            <p style={styles.emptyEmoji}>🌱</p>
            <p style={styles.emptyText}>
              {activeTab === "public"
                ? "아직 후원 내역이 없습니다. 첫 번째 후원자가 되어보세요!"
                : "아직 후원 내역이 없습니다."}
            </p>
          </div>
        ) : (
          displayList.map((donation) => (
            <div key={donation.id} style={styles.donationCard}>
              <div style={styles.donationLeft}>
                <p style={styles.donorName}>
                  {donation.donorNickname}
                </p>
                {donation.message && (
                  <p style={styles.donationMessage}>
                    💬 {donation.message}
                  </p>
                )}
                <p style={styles.donationDate}>
                  {donation.paidDate
                    ? new Date(donation.paidDate).toLocaleDateString("ko-KR")
                    : new Date(donation.createdDate).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <div style={styles.donationRight}>
                <p style={styles.donationAmount}>
                  {donation.amount?.toLocaleString()}원
                </p>
                {donation.payMethod && (
                  <p style={styles.donationMethod}>
                    {PAY_METHOD_LABEL[donation.payMethod] || donation.payMethod}
                  </p>
                )}
                <span
                  style={{
                    ...styles.statusBadge,
                    background: (STATUS_LABEL[donation.status]?.color || "#6b7280") + "22",
                    color: STATUS_LABEL[donation.status]?.color || "#6b7280",
                    border: `1px solid ${STATUS_LABEL[donation.status]?.color || "#6b7280"}44`,
                  }}
                >
                  {STATUS_LABEL[donation.status]?.text || donation.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
    marginBottom: "24px",
    width: "100%",
    maxWidth: "560px",
  },
  title: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#fff",
    margin: "0 0 8px",
    background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "15px",
    color: "rgba(255,255,255,0.6)",
    marginBottom: "24px",
  },
  totalCard: {
    background: "linear-gradient(135deg, rgba(108,99,255,0.2), rgba(79,172,254,0.2))",
    border: "1px solid rgba(108,99,255,0.3)",
    borderRadius: "20px",
    padding: "24px",
    backdropFilter: "blur(10px)",
  },
  totalLabel: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.5)",
    margin: "0 0 6px",
  },
  totalAmount: {
    fontSize: "42px",
    fontWeight: "900",
    color: "#fff",
    margin: "0 0 4px",
  },
  totalAmountUnit: {
    fontSize: "20px",
    fontWeight: "500",
  },
  totalCount: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.6)",
    margin: 0,
  },
  donateBtn: {
    marginBottom: "20px",
    padding: "14px 32px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #6c63ff, #4facfe)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(108,99,255,0.4)",
  },
  tabGroup: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
  },
  tab: {
    padding: "10px 24px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "transparent",
    color: "rgba(255,255,255,0.6)",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  tabActive: {
    background: "rgba(108,99,255,0.25)",
    border: "1px solid #6c63ff",
    color: "#fff",
    fontWeight: "700",
  },
  listContainer: {
    width: "100%",
    maxWidth: "560px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  emptyBox: {
    textAlign: "center",
    padding: "60px 0",
  },
  emptyEmoji: {
    fontSize: "48px",
    marginBottom: "12px",
  },
  emptyText: {
    fontSize: "15px",
    color: "rgba(255,255,255,0.4)",
  },
  donationCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    padding: "18px 22px",
    transition: "transform 0.2s",
  },
  donationLeft: {},
  donorName: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#fff",
    margin: "0 0 4px",
  },
  donationMessage: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.55)",
    margin: "0 0 4px",
    maxWidth: "260px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  donationDate: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.35)",
    margin: 0,
  },
  donationRight: {
    textAlign: "right",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "4px",
  },
  donationAmount: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#a78bfa",
    margin: 0,
  },
  donationMethod: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.45)",
    margin: 0,
  },
  statusBadge: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 10px",
    borderRadius: "20px",
  },
};
