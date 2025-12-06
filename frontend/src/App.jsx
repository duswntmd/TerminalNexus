import { BrowserRouter, Routes, Route } from "react-router-dom";

import JoinPage from "./pages/JoinPage";
import LoginPage from "./pages/LoginPage";
import CookiePage from "./pages/CookiePage";
import UserPage from "./pages/UserPage";
import MainPage from "./pages/MainPage";
import GuidePage from "./pages/GuidePage";
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
              <Route 
                path="/cookie" 
                element={
                  <ProtectedRoute>
                    <CookiePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/user" 
                element={
                  <ProtectedRoute>
                    <UserPage />
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