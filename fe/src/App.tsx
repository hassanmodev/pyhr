import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Spinner } from './components/ui/Spinner';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Companies } from './pages/Companies';
import { Departments } from './pages/Departments';
import { Employees } from './pages/Employees';
import { Layout } from './components/layout/Layout';

function HomepageRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) return (
    <div className="flex h-full items-center justify-center">
      <Spinner className="w-5 h-5" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'employee') return <Profile />;
  return <Dashboard />;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Layout />}>
        <Route index element={<HomepageRouter />} />
        <Route path="companies" element={<Companies />} />
        <Route path="departments" element={<Departments />} />
        <Route path="employees" element={<Employees />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
