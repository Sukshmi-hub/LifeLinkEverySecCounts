import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * ProtectedRoute - The "Gatekeeper" component.
 * It checks if a user is logged in and if they have the right role.
 */
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  
  // 1. Check if the "VIP Pass" exists in browser memory
  const token = localStorage.getItem('token');
  const storedUser = JSON.parse(localStorage.getItem('user'));

  // 2. While the app is checking the database, show a loading spinner
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking credentials...</p>
        </div>
      </div>
    );
  }

  // 3. If there is NO token and NO auth, send the user back to Login
  if (!token && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. Role Protection: Ensure the user's role is allowed on this page
  // We use .toLowerCase() to match the database role with the route logic
  const currentUser = user || storedUser;
  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role.toLowerCase())) {
    // If a Donor tries to enter the Admin dashboard, send them to their own page
    const dashboardPath = `/${currentUser.role.toLowerCase()}-dashboard`;
    return <Navigate to={dashboardPath} replace />;
  }

  // 5. If everything looks good, show the Dashboard!
  return <>{children}</>;
}

export default ProtectedRoute;