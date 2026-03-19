import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import FeatureGuard from './components/FeatureGuard'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import HomePage from './pages/HomePage'
import AssessmentPage from './pages/AssessmentPage'
import ProfilePage from './pages/ProfilePage'
import MatchingPage from './pages/MatchingPage'
import InterviewPage from './pages/InterviewPage'
import CareerPlanPage from './pages/CareerPlanPage'
import QuizPage from './pages/QuizPage'
import SettingsPage from './pages/SettingsPage'
import UsagePage from './pages/UsagePage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/assessment" element={<FeatureGuard feature="assessment"><AssessmentPage /></FeatureGuard>} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/matching" element={<FeatureGuard feature="matching"><MatchingPage /></FeatureGuard>} />
          <Route path="/interview" element={<FeatureGuard feature="interview"><InterviewPage /></FeatureGuard>} />
          <Route path="/career" element={<FeatureGuard feature="career"><CareerPlanPage /></FeatureGuard>} />
          <Route path="/quiz" element={<FeatureGuard feature="quiz"><QuizPage /></FeatureGuard>} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
