import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import { UserRole } from "@/data/users";
import { serverUrl } from '@/lib/serverConfig';

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
    // Prefer our SPA storage key, but also accept auth placed by server login flow
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState({ user: parsed.user, isAuthenticated: true, isLoading: false });
        return;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Support server login which stores 'user' and 'token' in localStorage
    const serverUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (serverUser && token) {
      try {
        const parsed = JSON.parse(serverUser);

        // Do NOT mark as authenticated yet. Validate token with server.
        setState((prev) => ({ ...prev, isLoading: true }));

        (async () => {
          try {
            const resp = await fetch(`${serverUrl}/api/profile`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!resp.ok) {
              // Token invalid / expired — clear server keys and remain logged out
              localStorage.removeItem('user');
              localStorage.removeItem('token');
              setState({ user: null, isAuthenticated: false, isLoading: false });
              return;
            }

            const json = await resp.json();
            if (json && json.success && json.data && json.data.user) {
              const p = json.data.user;
              const refined = {
                id: p.id || parsed.id || parsed._id,
                name: p.fullName || p.name || parsed.name,
                email: p.email || parsed.email,
                phone: p.phone || parsed.phone || '',
                role: parsed.role || p.role,
                verified: (p.verified || p.is_verified || parsed.verified) || false,
                location: (p.location && (p.location.full_address || p.location.city || p.location.state)) ? (p.location.full_address || `${p.location.city || ''}${p.location.city && p.location.state ? ', ' : ''}${p.location.state || ''}`) : (parsed.location || ''),
              };
              setState({ user: refined, isAuthenticated: true, isLoading: false });
              localStorage.setItem('user', JSON.stringify(refined));
              localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: refined }));
              return;
            }
          } catch (e) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            setState({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }
        })();

        return;
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }

    setState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  // Listen for server-login events dispatched by non-SPA login flow
  useEffect(() => {
    const handler = async (e) => {
      try {
        const { user: serverUser, token } = e.detail || {};
        if (!serverUser || !token) return;

        // store raw server values
        localStorage.setItem('user', JSON.stringify(serverUser));
        localStorage.setItem('token', token);

        // attempt to fetch rich profile and validate token
        try {
          const resp = await fetch(`${serverUrl}/api/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!resp.ok) {
            // invalid token — clear and abort
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            setState({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }

          const json = await resp.json();
          if (json && json.success && json.data && json.data.user) {
            const p = json.data.user;
            const refined = {
              id: p.id || serverUser.id || serverUser._id,
              name: p.fullName || p.name || serverUser.name,
              email: p.email || serverUser.email,
              phone: p.phone || serverUser.phone || '',
              role: serverUser.role || p.role,
              verified: (p.verified || p.is_verified || serverUser.verified) || false,
              location: (p.location && (p.location.full_address || p.location.city || p.location.state)) ? (p.location.full_address || `${p.location.city || ''}${p.location.city && p.location.state ? ', ' : ''}${p.location.state || ''}`) : (serverUser.location || ''),
            };
            setState({ user: refined, isAuthenticated: true, isLoading: false });
            localStorage.setItem('user', JSON.stringify(refined));
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: refined }));
            return;
          }
        } catch (err) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setState({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener('server-login', handler)
    return () => window.removeEventListener('server-login', handler)
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
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  /* ---------------- UPDATE USER ---------------- */
  const updateUser = (updates) => {
    if (!state.user) return;

    const updatedUser = { ...state.user, ...updates };
    setState((prev) => ({ ...prev, user: updatedUser }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: updatedUser }));
    // Keep server login key in sync if present
    if (localStorage.getItem('user')) {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
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


