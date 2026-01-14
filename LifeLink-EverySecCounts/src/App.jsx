import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ChatProvider } from "@/context/ChatContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { SharedChatProvider } from "@/context/SharedChatContext";
import { DonorProvider } from "@/context/DonorContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Public pages
import Home from "./pages/public/Home";
import Login from "./pages/public/Login";
import About from "./pages/public/About";
import TributeWall from "./pages/public/TributeWall";
import NotFound from "./pages/NotFound";
import RedAlertPage from "./pages/RedAlertPage";

// Role dashboards
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientRequestPage from "./pages/patient/PatientRequestPage";
import FindHospitalPage from "./pages/patient/FindHospitalPage";
import RequestFundsPage from "./pages/patient/RequestFundsPage";
import PaymentPage from "./pages/patient/PaymentPage";
import PatientProfilePage from "./pages/patient/PatientProfilePage";
import PatientMessagesPage from "./pages/patient/PatientMessagesPage";
import PatientSettingsPage from "./pages/patient/PatientSettingsPage";
import DonorDashboard from "./pages/donor/DonorDashboard";
import DonorRegister from "./pages/donor/DonorRegister";
import DonorAlerts from "./pages/donor/DonorAlerts";
import DonorChat from "./pages/donor/DonorChat";
import DonorMessagesPage from "./pages/donor/DonorMessagesPage";
import DonorProfilePage from "./pages/donor/DonorProfilePage";
import DonorSettingsPage from "./pages/donor/DonorSettingsPage";
import HospitalDashboard from "./pages/hospital/HospitalDashboard";
import NgoDashboard from "./pages/ngo/NgoDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationProvider>
        <DonorProvider>
          <SharedChatProvider>
            <ChatProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/tribute" element={<TributeWall />} />
                    <Route path="/red-alert" element={<RedAlertPage />} />

                    {/* Patient Routes */}
                    <Route path="/patient/dashboard" element={<ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>} />
                    <Route path="/patient/request" element={<ProtectedRoute allowedRoles={['patient']}><PatientRequestPage /></ProtectedRoute>} />
                    <Route path="/patient/find-hospital" element={<ProtectedRoute allowedRoles={['patient']}><FindHospitalPage /></ProtectedRoute>} />
                    <Route path="/patient/request-funds" element={<ProtectedRoute allowedRoles={['patient']}><RequestFundsPage /></ProtectedRoute>} />
                    <Route path="/patient/payment" element={<ProtectedRoute allowedRoles={['patient']}><PaymentPage /></ProtectedRoute>} />
                    <Route path="/patient/profile" element={<ProtectedRoute allowedRoles={['patient']}><PatientProfilePage /></ProtectedRoute>} />
                    <Route path="/patient/messages" element={<ProtectedRoute allowedRoles={['patient']}><PatientMessagesPage /></ProtectedRoute>} />
                    <Route path="/patient/settings" element={<ProtectedRoute allowedRoles={['patient']}><PatientSettingsPage /></ProtectedRoute>} />
                    <Route path="/patient/search" element={<ProtectedRoute allowedRoles={['patient']}><FindHospitalPage /></ProtectedRoute>} />
                    <Route path="/patient/chat" element={<ProtectedRoute allowedRoles={['patient']}><PatientMessagesPage /></ProtectedRoute>} />

                    {/* Donor Routes */}
                    <Route path="/donor/dashboard" element={<ProtectedRoute allowedRoles={['donor']}><DonorDashboard /></ProtectedRoute>} />
                    <Route path="/donor/register" element={<ProtectedRoute allowedRoles={['donor']}><DonorRegister /></ProtectedRoute>} />
                    <Route path="/donor/alerts" element={<ProtectedRoute allowedRoles={['donor']}><DonorAlerts /></ProtectedRoute>} />
                    <Route path="/donor/chat" element={<ProtectedRoute allowedRoles={['donor']}><DonorChat /></ProtectedRoute>} />
                    <Route path="/donor/messages" element={<ProtectedRoute allowedRoles={['donor']}><DonorMessagesPage /></ProtectedRoute>} />
                    <Route path="/donor/profile" element={<ProtectedRoute allowedRoles={['donor']}><DonorProfilePage /></ProtectedRoute>} />
                    <Route path="/donor/settings" element={<ProtectedRoute allowedRoles={['donor']}><DonorSettingsPage /></ProtectedRoute>} />

                    {/* Hospital Routes */}
                    <Route path="/hospital/dashboard" element={<ProtectedRoute allowedRoles={['hospital']}><HospitalDashboard /></ProtectedRoute>} />
                    <Route path="/hospital/request" element={<ProtectedRoute allowedRoles={['hospital']}><HospitalDashboard /></ProtectedRoute>} />
                    <Route path="/hospital/emergency" element={<ProtectedRoute allowedRoles={['hospital']}><HospitalDashboard /></ProtectedRoute>} />
                    <Route path="/hospital/chat" element={<ProtectedRoute allowedRoles={['hospital']}><HospitalDashboard /></ProtectedRoute>} />

                    {/* NGO Routes */}
                    <Route path="/ngo/dashboard" element={<ProtectedRoute allowedRoles={['ngo']}><NgoDashboard /></ProtectedRoute>} />
                    <Route path="/ngo/support" element={<ProtectedRoute allowedRoles={['ngo']}><NgoDashboard /></ProtectedRoute>} />
                    <Route path="/ngo/chat" element={<ProtectedRoute allowedRoles={['ngo']}><NgoDashboard /></ProtectedRoute>} />

                    {/* Admin Routes */}
                    <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/requests" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/alerts" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/tributes" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </ChatProvider>
          </SharedChatProvider>
        </DonorProvider>
      </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;