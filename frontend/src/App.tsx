import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, lazy } from 'react'
import { PrivateRoute } from './components/PrivateRoute'
import { UserMenu } from './components/UserMenu'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'
import { logout, setAuthFromStorage } from './features/auth/authSlice'
import { useEffect } from 'react'
import { SidebarProvider } from './contexts/SidebarContext'
import { CreateSessionModal } from './components/chat/CreateSessionModal'
import { ChatWindowWithSession } from './components/chat/ChatWindow';

const queryClient = new QueryClient()

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })))
const StreamPage = lazy(() => import('./pages/StreamPage').then(m => ({ default: m.StreamPage })))
const StreamFreePage = lazy(() => import('./pages/StreamFreePage').then(m => ({ default: m.StreamFreePage })))
const History = lazy(() => import('./pages/History').then(m => ({ default: m.History })))
const Performance = lazy(() => import('./pages/Performance').then(m => ({ default: m.Performance })))
const ModelComparison = lazy(() => import('./pages/ModelComparison').then(m => ({ default: m.default })))
const ChatSessions = lazy(() => import('./pages/ChatSessions').then(m => ({ default: m.default })))

function Sidebar({ isAuthenticated }: { isAuthenticated: boolean}) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await dispatch(logout());
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="w-64 bg-[#1E293B] border-r border-[#334155] h-screen fixed left-0 top-0 flex flex-col justify-between shadow-lg">
      <div>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-[#F8FAFC] mb-8">
            AI Model Playground
          </h1>
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
                <NavLink
                  to="/stream"
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
                  }
                >
                  Compare
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
  useEffect(() => {
    dispatch(setAuthFromStorage());
  }, [dispatch]);
  return null;
}

function App() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const handleCloseNewChat = () => setIsCreateModalOpen(false);

  return (
    <SidebarProvider>
      <QueryClientProvider client={queryClient}>
        <AuthLoader />
        <Router>
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
                      <Sidebar isAuthenticated={true} />
                      <div className="ml-64 min-h-screen bg-[#0F172A]">
                        {isAuthenticated && (
                          <div className="flex justify-end items-center h-16 px-8 border-b border-[#334155] bg-[#1E293B]">
                            <UserMenu />
                          </div>
                        )}
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
                            <Route path="/performance" element={<Performance />} />
                            <Route path="/model-comparison" element={<ModelComparison />} />
                            <Route path="*" element={<Navigate to="/stream" replace />} />
                          </Routes>
                        </Suspense>
                      </div>
                    </PrivateRoute>
                  ) : (
                    <>
                      <Sidebar isAuthenticated={false} />
                      <div className="ml-64 min-h-screen bg-[#0F172A]">
                        {isAuthenticated && (
                          <div className="flex justify-end items-center h-16 px-8 border-b border-[#334155] bg-[#1E293B]">
                            <UserMenu />
                          </div>
                        )}
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
        </Router>
      </QueryClientProvider>
    </SidebarProvider>
  )
}

export default App 