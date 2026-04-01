import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { DemoProvider } from './DemoContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EnquiryForm from './pages/EnquiryForm';
import Enquiries from './pages/Enquiries';
import EnquiryDetail from './pages/EnquiryDetail';
import Appointments from './pages/Appointments';
import Notifications from './pages/Notifications';
import AIChat from './pages/AIChat';
import StudentDirectory from './pages/StudentDirectory';
import StudentProfile from './pages/StudentProfile';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <DemoProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="students" element={<StudentDirectory />} />
              <Route path="students/:id" element={<StudentProfile />} />
              <Route path="enquiries" element={<Enquiries />} />
              <Route path="enquiries/new" element={<EnquiryForm />} />
              <Route path="enquiries/:id" element={<EnquiryDetail />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="ai-chat" element={<AIChat />} />
            </Route>
          </Routes>
        </Router>
      </DemoProvider>
    </AuthProvider>
  );
}
