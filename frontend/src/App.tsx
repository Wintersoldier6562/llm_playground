import React, { useState, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import { PrivateRoute } from './components/PrivateRoute'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'
import { logout, setAuthFromStorage, fetchUserDetails } from './features/auth/authSlice'
import { useEffect } from 'react'
import { SidebarProvider } from './contexts/SidebarContext'
import { CreateSessionModal } from './components/chat/CreateSessionModal'
import { ComparisonDetail } from './components/ComparisonDetail';

const queryClient = new QueryClient()

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })))
const StreamPage = lazy(() => import('./pages/StreamPage'))
const StreamFreePage = lazy(() => import('./pages/StreamFreePage'))
const History = lazy(() => import('./pages/History'))
const Performance = lazy(() => import('./pages/Performance'))
const ModelComparison = lazy(() => import('./pages/ModelComparison'))
const ChatSessions = lazy(() => import('./pages/ChatSessions').then(m => ({ default: m.default })))

const ChatWindowWithSession = lazy(() =>
  import('./components/chat/ChatWindow').then(m => ({ default: m.ChatWindowWithSession }))
);

// Chevron icons
export const ChevronLeftIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
export const ChevronRightIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

function Sidebar({ isAuthenticated, className }: { isAuthenticated: boolean, className?: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [isComparisonExpanded, setIsComparisonExpanded] = useState(false);

  const handleLogout = async () => {
    try {
      await dispatch(logout());
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login', { replace: true });
    }
  };

  const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
    <svg
      className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );

  return (
    <div className={`w-64 bg-[#1E293B] border-r border-[#334155] h-screen fixed left-0 top-0 flex flex-col justify-between shadow-lg z-40 ${className || ''}`}>
      <div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-[#F8FAFC]">
              Multi-LLM Playground
            </h1>
          </div>
          <nav className="space-y-2">
            {isAuthenticated ? (
              <>
                <NavLink
                  to="/chat"
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
                  }
                >
                  Chat Sessions
                </NavLink>
                <div className="space-y-1">
                  <button
                    onClick={() => setIsComparisonExpanded(!isComparisonExpanded)}
                    className="nav-link-inactive w-full flex items-center justify-between px-4 py-2 rounded-lg text-base font-medium hover:bg-[#2D3A4F] hover:text-[#F8FAFC]"
                  >
                    <span>Compare</span>
                    <ChevronIcon expanded={isComparisonExpanded} />
                  </button>
                  {isComparisonExpanded && (
                    <div className="pl-4 space-y-1">
                      <NavLink
                        to="/stream"
                        className={({ isActive }) =>
                          `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
                        }
                      >
                        Compare Models
                      </NavLink>
                      <NavLink
                        to="/history"
                        className={({ isActive }) =>
                          `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
                        }
                      >
                        History
                      </NavLink>
                      <NavLink
                        to="/performance"
                        className={({ isActive }) =>
                          `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
                        }
                      >
                        Performance
                      </NavLink>
                    </div>
                  )}
                </div>
                <NavLink
                  to="/model-comparison"
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
                  }
                >
                  Model Comparison
                </NavLink>
              </>
            ) : (
              <>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
                  }
                >
                  Playground
                </NavLink>
                <NavLink
                  to="/model-comparison"
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
                  }
                >
                  Model Comparison
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </div>
      {isAuthenticated && (
        <div className="p-6">
          <button
            onClick={handleLogout}
            className="btn-danger w-full"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

function AuthLoader() {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  useEffect(() => {
    dispatch(setAuthFromStorage());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchUserDetails());
    }
  }, [dispatch, isAuthenticated]);

  return null;
}

function AppContent() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const handleCloseNewChat = () => setIsCreateModalOpen(false);

  return (
    <>
      <CreateSessionModal isOpen={isCreateModalOpen} onClose={handleCloseNewChat} />
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#0F172A] text-[#F8FAFC]">
          <div className="animate-pulse">Loading...</div>
        </div>
      }>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="*"
            element={
              isAuthenticated ? (
                <PrivateRoute>
                  <Sidebar isAuthenticated={true} className={`fixed left-0 top-0 h-screen z-40 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} />
                  {isSidebarOpen && (
                    <button
                      className="fixed top-6 left-64 z-50 bg-[#1E293B] text-[#F8FAFC] w-10 h-10 flex items-center justify-center rounded-full shadow-lg hover:bg-[#2D3A4F] transition-all border border-[#334155]"
                      onClick={() => setIsSidebarOpen(false)}
                      aria-label="Hide sidebar"
                      style={{ transform: 'translateX(-50%)' }}
                    >
                      <ChevronLeftIcon />
                    </button>
                  )}
                  {!isSidebarOpen && (
                    <button
                      className="fixed top-6 left-2 z-50 bg-[#1E293B] text-[#F8FAFC] w-10 h-10 flex items-center justify-center rounded-full shadow-lg hover:bg-[#2D3A4F] transition-all border border-[#334155]"
                      onClick={() => setIsSidebarOpen(true)}
                      aria-label="Show sidebar"
                    >
                      <ChevronRightIcon />
                    </button>
                  )}
                  <div className={`transition-all duration-300 min-h-screen bg-[#0F172A] ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
                    <Suspense fallback={
                      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-[#0F172A] text-[#F8FAFC]">
                        <div className="animate-pulse">Loading...</div>
                      </div>
                    }>
                      <Routes>
                        <Route path="/chat" element={<ChatSessions />} />
                        <Route path="/chat/:sessionId" element={<ChatWindowWithSession />} />
                        <Route path="/stream" element={<StreamPage />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/comparison/:promptId" element={<ComparisonDetail />} />
                        <Route path="/performance" element={<Performance />} />
                        <Route path="/model-comparison" element={<ModelComparison />} />
                        <Route path="*" element={<Navigate to="/chat" replace />} />
                      </Routes>
                    </Suspense>
                  </div>
                </PrivateRoute>
              ) : (
                <>
                  <Sidebar isAuthenticated={false} />
                  <div className="ml-64 min-h-screen bg-[#0F172A]">
                    <Suspense fallback={
                      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-[#0F172A] text-[#F8FAFC]">
                        <div className="animate-pulse">Loading...</div>
                      </div>
                    }>
                      <Routes>
                        <Route path="/" element={<StreamFreePage />} />
                        <Route path="/model-comparison" element={<ModelComparison />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Suspense>
                  </div>
                </>
              )
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <SidebarProvider>
      <QueryClientProvider client={queryClient}>
        <AuthLoader />
        <Router>
          <AppContent />
        </Router>
      </QueryClientProvider>
    </SidebarProvider>
  );
}

export default App 