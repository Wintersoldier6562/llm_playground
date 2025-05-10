import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Login } from './pages/Login'
import { StreamPage } from './pages/StreamPage'
import { History } from './pages/History'
import { Performance } from './pages/Performance'
import { PrivateRoute } from './components/PrivateRoute'
import { UserMenu } from './components/UserMenu'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from './store'
import { logout, setAuthFromStorage } from './features/auth/authSlice'
import { useEffect } from 'react'

const queryClient = new QueryClient()

function Sidebar() {
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
    <div className="w-64 bg-white border-r border-[#DFE1E6] h-screen fixed left-0 top-0 flex flex-col justify-between">
      <div>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-[#172B4D] mb-8">
            AI Model Playground
          </h1>
          <nav className="space-y-2">
            <NavLink
              to="/stream"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-md text-base font-medium ${isActive ? 'bg-[#E6FCFF] text-[#0052CC]' : 'text-[#172B4D] hover:bg-[#F4F5F7]'}`
              }
            >
              Compare
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-md text-base font-medium ${isActive ? 'bg-[#E6FCFF] text-[#0052CC]' : 'text-[#172B4D] hover:bg-[#F4F5F7]'}`
              }
            >
              History
            </NavLink>
            <NavLink
              to="/performance"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-md text-base font-medium ${isActive ? 'bg-[#E6FCFF] text-[#0052CC]' : 'text-[#172B4D] hover:bg-[#F4F5F7]'}`
              }
            >
              Performance
            </NavLink>
          </nav>
        </div>
      </div>
      <div className="p-6">
        <button
          onClick={handleLogout}
          className="w-full py-2 px-4 rounded bg-red-600 text-white font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Logout
        </button>
      </div>
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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthLoader />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="*"
            element={
              <PrivateRoute>
                <Sidebar />
                <div className="ml-64 min-h-screen bg-[#F4F5F7]">
                  <div className="flex justify-end items-center h-16 px-8">
                    <UserMenu />
                  </div>
                  <Routes>
                    <Route path="/stream" element={<StreamPage />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/performance" element={<Performance />} />
                    <Route path="*" element={<Navigate to="/stream" replace />} />
                  </Routes>
                </div>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App 