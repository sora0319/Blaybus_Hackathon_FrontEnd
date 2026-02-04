import { Routes, Route } from "react-router-dom";

import LandingPage from "../pages/LandingPage";
import SignupPage from "../pages/SignupPage";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import StudyPage from "../pages/StudyPage";
import PartsPage from "../pages/PartsPage";

function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/study" element={<StudyPage />} />
            <Route path="/parts" element={<PartsPage />} />
        </Routes>
    )
}

export default AppRouter;