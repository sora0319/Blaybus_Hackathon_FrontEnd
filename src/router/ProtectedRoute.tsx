import { Navigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();

  // 🔹 아직 auth 체크 중
  if (isAuthenticated === null) {
    return <div style={{ color: "white" }}>Auth Loading...</div>;
  }

  // 🔹 로그인 안 된 경우
  if (isAuthenticated === false) {
    return <Navigate to="/login" replace />;
  }

  // 🔹 정상
  return children;
}
