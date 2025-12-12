import { BrowserRouter, Routes, Route } from "react-router-dom";

import JoinPage from "./pages/JoinPage";
import LoginPage from "./pages/LoginPage";
import CookiePage from "./pages/CookiePage";
import UserPage from "./pages/UserPage";
import MainPage from "./pages/MainPage";
import GuidePage from "./pages/GuidePage";
import FreeBoardList from "./pages/freeboard/FreeBoardList";
import FreeBoardRegister from "./pages/freeboard/FreeBoardRegister";
import FreeBoardRead from "./pages/freeboard/FreeBoardRead";

import Header from "./components/Header";
import Footer from "./components/Footer";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import './App.css'

function App() {

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/join" element={<JoinPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/guide" element={<GuidePage />} />
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
                path="/freeboard/:id" 
                element={
                  <ProtectedRoute>
                    <FreeBoardRead />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App