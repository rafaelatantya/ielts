import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { AppShell } from './components/layout/AppShell'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { SpeakingPage } from './pages/SpeakingPage'
import { WritingPage } from './pages/WritingPage'
import { ReadingPage } from './pages/ReadingPage'
import { ListeningPage } from './pages/ListeningPage'
import { ReviewPage } from './pages/ReviewPage'
import { FeaturesPage } from './pages/FeaturesPage'
import { AccountPage } from './pages/AccountPage'

const DashboardGuard: React.FC = () => {
  const { meta } = useApp()
  if (!meta.onboarding_completed) {
    return <Navigate to="/onboarding" replace />
  }
  return <DashboardPage />
}

export const AppContent: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Onboarding Screen (Full canvas editorial sheet) */}
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Global App Shell & Study Modules */}
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardGuard />} />
          <Route path="/speaking" element={<SpeakingPage />} />
          <Route path="/writing" element={<WritingPage />} />
          <Route path="/reading" element={<ReadingPage />} />
          <Route path="/listening" element={<ListeningPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
