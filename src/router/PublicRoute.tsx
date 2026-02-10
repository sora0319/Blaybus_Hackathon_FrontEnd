import { Navigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

export default function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}