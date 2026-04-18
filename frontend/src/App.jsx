import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import JoinPage from "./pages/member/JoinPage";
import LoginPage from "./pages/member/LoginPage";
import CookiePage from "./pages/CookiePage";
import UserPage from "./pages/member/UserPage";
import MainPage from "./pages/MainPage";
import GuidePage from "./pages/GuidePage";
import FreeBoardList from "./pages/freeboard/FreeBoardList";
import FreeBoardRegister from "./pages/freeboard/FreeBoardRegister";
import FreeBoardRead from "./pages/freeboard/FreeBoardRead";
import AdminUserManagePage from "./pages/admin/AdminUserManagePage";
import AdminPage from "./pages/AdminPage";
import FruitAIPage from "./pages/FruitAIPage";
import ChatPage from "./pages/ChatPage";
import DonationPage from "./pages/donation/DonationPage";
import DonationSuccessPage from "./pages/donation/DonationSuccessPage";
import DonationHistoryPage from "./pages/donation/DonationHistoryPage";


import Header from "./components/Header";
import Footer from "./components/Footer";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import './App.css'

// ★ AuthContext 초기화 완료 전 빈 화면 방지: loading 동안 스피너를 표시
const AppContent = () => {
  const { loading } = useAuth();

  // 인증 상태 확인이 끝날 때까지 최소한의 로딩 화면 표시
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#ffffff'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #e0e0e0',
          borderTop: '3px solid #1a1a1a',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route
            path="/fruit-ai"
            element={
              <ProtectedRoute>
                <FruitAIPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route path="/cookie" element={<CookiePage />} />
          <Route
            path="/user"
            element={
              <ProtectedRoute>
                <UserPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/freeboard"
            element={
              <ProtectedRoute>
                <FreeBoardList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/freeboard/register"
            element={
              <ProtectedRoute>
                <FreeBoardRegister />
              </ProtectedRoute>
            }
          />
          <Route
            path="/freeboard/edit/:id"
            element={
              <ProtectedRoute>
                <FreeBoardRegister />
              </ProtectedRoute>
            }
          />
          <Route
            path="/freeboard/:id"
            element={
              <ProtectedRoute>
                <FreeBoardRead />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/users"
            element={
              <ProtectedRoute>
                <AdminUserManagePage />
              </ProtectedRoute>
            }
          />
          {/* 후원 */}
          <Route path="/donation" element={<DonationPage />} />
          <Route path="/donation/success" element={<DonationSuccessPage />} />
          <Route path="/donation/history" element={<DonationHistoryPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

function App() {

  return (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App