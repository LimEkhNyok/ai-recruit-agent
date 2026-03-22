import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
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
import AchievementPage from './pages/AchievementPage'
import SettingsPage from './pages/SettingsPage'
import UsagePage from './pages/UsagePage'

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="sync">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={
            <PageTransition>
              <LoginPage />
            </PageTransition>
          }
        />
        <Route
          path="/register"
          element={
            <PageTransition>
              <RegisterPage />
            </PageTransition>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PageTransition>
              <ForgotPasswordPage />
            </PageTransition>
          }
        />
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <PageTransition>
                <HomePage />
              </PageTransition>
            }
          />
          <Route element={<ProtectedRoute />}>
            <Route
              path="/assessment"
              element={
                <PageTransition>
                  <FeatureGuard feature="assessment">
                    <AssessmentPage />
                  </FeatureGuard>
                </PageTransition>
              }
            />
            <Route
              path="/profile"
              element={
                <PageTransition>
                  <ProfilePage />
                </PageTransition>
              }
            />
            <Route
              path="/matching"
              element={
                <PageTransition>
                  <FeatureGuard feature="matching">
                    <MatchingPage />
                  </FeatureGuard>
                </PageTransition>
              }
            />
            <Route
              path="/interview"
              element={
                <PageTransition>
                  <FeatureGuard feature="interview">
                    <InterviewPage />
                  </FeatureGuard>
                </PageTransition>
              }
            />
            <Route
              path="/career"
              element={
                <PageTransition>
                  <FeatureGuard feature="career">
                    <CareerPlanPage />
                  </FeatureGuard>
                </PageTransition>
              }
            />
            <Route
              path="/quiz"
              element={
                <PageTransition>
                  <FeatureGuard feature="quiz">
                    <QuizPage />
                  </FeatureGuard>
                </PageTransition>
              }
            />
            <Route
              path="/achievements"
              element={
                <PageTransition>
                  <AchievementPage />
                </PageTransition>
              }
            />
            <Route
              path="/usage"
              element={
                <PageTransition>
                  <UsagePage />
                </PageTransition>
              }
            />
            <Route
              path="/settings"
              element={
                <PageTransition>
                  <SettingsPage />
                </PageTransition>
              }
            />
          </Route>
        </Route>
      </Routes>
    </AnimatePresence>
  )
}
