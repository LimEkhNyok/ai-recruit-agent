import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import AssessmentPage from './pages/AssessmentPage'
import ProfilePage from './pages/ProfilePage'
import MatchingPage from './pages/MatchingPage'
import InterviewPage from './pages/InterviewPage'
import CareerPlanPage from './pages/CareerPlanPage'
import QuizPage from './pages/QuizPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/assessment" element={<AssessmentPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/matching" element={<MatchingPage />} />
        <Route path="/interview" element={<InterviewPage />} />
        <Route path="/career" element={<CareerPlanPage />} />
        <Route path="/quiz" element={<QuizPage />} />
      </Route>
    </Routes>
  )
}
