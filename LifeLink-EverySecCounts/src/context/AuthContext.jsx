import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import { UserRole } from "@/data/users";

const AuthContext = createContext(undefined);

const STORAGE_KEY = "lifelink_auth";

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  /* ---------------- LOAD SESSION ---------------- */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState({
          user: parsed.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  /* ---------------- LOGIN ---------------- */
  const login = async (email, _password, role) => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const isPatient = role === UserRole.PATIENT;

    const mockUser = {
      id: `usr_${Date.now()}`,
      name: email
        .split("@")[0]
        .replace(/[._]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      email,
      phone: "+1234567890",
      role,
      verified: true,
      createdAt: new Date().toISOString(),
      status: "active",
      location: "New York, NY",
    };

    if (isPatient) {
      localStorage.setItem(
        "lifelink_patient_data",
        JSON.stringify({
          activeRequests: 0,
          pending: 0,
          matched: 0,
          emergencies: 0,
          totalDonations: 0,
          livesSaved: 0,
        })
      );
    }

    setState({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: mockUser }));
    return true;
  };

  /* ---------------- REGISTER ---------------- */
  const register = async (userData) => {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const pendingUser = {
      id: `usr_${Date.now()}`,
      ...userData,
      verified: false,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    localStorage.setItem("lifelink_pending_user", JSON.stringify(pendingUser));
    localStorage.setItem("lifelink_otp", otp);

    return { success: true, otp };
  };

  /* ---------------- OTP VERIFY ---------------- */
  const verifyOtp = async (otp, expectedOtp) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (otp !== expectedOtp) return false;

    const pendingUser = localStorage.getItem("lifelink_pending_user");
    if (!pendingUser) return false;

    const user = {
      ...JSON.parse(pendingUser),
      verified: true,
      status: "active",
    };

    setState({
      user,
      isAuthenticated: true,
      isLoading: false,
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user }));
    localStorage.removeItem("lifelink_pending_user");
    localStorage.removeItem("lifelink_otp");

    return true;
  };

  /* ---------------- LOGOUT ---------------- */
  const logout = () => {
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  /* ---------------- UPDATE USER ---------------- */
  const updateUser = (updates) => {
    if (!state.user) return;

    const updatedUser = { ...state.user, ...updates };
    setState((prev) => ({ ...prev, user: updatedUser }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: updatedUser }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        verifyOtp,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ---------------- HOOK ---------------- */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/* ---------------- ROLE REDIRECT ---------------- */
export function getRoleBasedRedirect(role) {
  const routes = {
    [UserRole.PATIENT]: "/patient/dashboard",
    [UserRole.DONOR]: "/donor/dashboard",
    [UserRole.HOSPITAL]: "/hospital/dashboard",
    [UserRole.NGO]: "/ngo/dashboard",
    [UserRole.ADMIN]: "/admin/dashboard",
  };

  return routes[role] || "/";
}
