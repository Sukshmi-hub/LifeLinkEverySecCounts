import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ChatProvider } from "@/context/ChatContext";
import { DotsProvider } from "@/context/DotsContext";
import { SharedChatProvider } from "@/context/SharedChatContext";
import { DonorProvider } from "@/context/DonorContext";
import { NotificationProvider } from "@/context/NotificationContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Public pages
import Home from "./pages/public/Home";
import Login from "./pages/public/Login";
import ResetPassword from "./pages/public/ResetPassword";
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
import PatientPaymentDemo from "./components/patient/PatientPaymentDemo";
import DonorDashboard from "./pages/donor/DonorDashboard";
import DonorRegister from "./pages/donor/DonorRegister";
import DonorChat from "./pages/donor/DonorChat";
import DonorMessagesPage from "./pages/donor/DonorMessagesPage";
import DonorProfilePage from "./pages/donor/DonorProfilePage";
import HospitalDashboard from "./pages/hospital/HospitalDashboard";
import NgoDashboard from "./pages/ngo/NgoDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationProvider>
        <DotsProvider>
          <DonorProvider>
          <SharedChatProvider>
            <ChatProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    {/* ========================================== */}
                    {/* PUBLIC ROUTES                              */}
                    {/* ========================================== */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Login />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/tribute" element={<TributeWall />} />
                    <Route path="/red-alert" element={<RedAlertPage />} />

                    {/* ========================================== */}
                    {/* PATIENT ROUTES (LOCKED)                    */}
                    {/* ========================================== */}
                    <Route path="/patient/dashboard" element={<ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>} />
                    <Route path="/patient/request" element={<ProtectedRoute allowedRoles={['patient']}><PatientRequestPage /></ProtectedRoute>} />
                    <Route path="/patient/find-hospital" element={<ProtectedRoute allowedRoles={['patient']}><FindHospitalPage /></ProtectedRoute>} />
                    <Route path="/patient/request-funds" element={<ProtectedRoute allowedRoles={['patient']}><RequestFundsPage /></ProtectedRoute>} />
                    <Route path="/patient/payment" element={<ProtectedRoute allowedRoles={['patient']}><PaymentPage /></ProtectedRoute>} />
                    <Route path="/patient/profile" element={<ProtectedRoute allowedRoles={['patient']}><PatientProfilePage /></ProtectedRoute>} />
                    <Route path="/patient/messages" element={<ProtectedRoute allowedRoles={['patient']}><PatientMessagesPage /></ProtectedRoute>} />
                    {/* Patient settings removed from routes */}

                    {/* ========================================== */}
                    {/* DONOR ROUTES (LOCKED)                      */}
                    {/* ========================================== */}
                    <Route path="/donor/dashboard" element={<ProtectedRoute allowedRoles={['donor']}><DonorDashboard /></ProtectedRoute>} />
                    <Route path="/donor/register" element={<ProtectedRoute allowedRoles={['donor']}><DonorRegister /></ProtectedRoute>} />
                    <Route path="/donor/chat" element={<ProtectedRoute allowedRoles={['donor']}><DonorChat /></ProtectedRoute>} />
                    <Route path="/donor/messages" element={<ProtectedRoute allowedRoles={['donor']}><DonorMessagesPage /></ProtectedRoute>} />
                    <Route path="/donor/profile" element={<ProtectedRoute allowedRoles={['donor']}><DonorProfilePage /></ProtectedRoute>} />
                    {/* Donor settings removed from routes */}

                    {/* ========================================== */}
                    {/* HOSPITAL ROUTES (LOCKED)                   */}
                    {/* ========================================== */}
                    <Route path="/hospital/dashboard" element={<ProtectedRoute allowedRoles={['hospital']}><HospitalDashboard /></ProtectedRoute>} />
                    <Route path="/hospital/request" element={<ProtectedRoute allowedRoles={['hospital']}><HospitalDashboard /></ProtectedRoute>} />

                    {/* ========================================== */}
                    {/* NGO ROUTES (LOCKED)                        */}
                    {/* ========================================== */}
                    <Route path="/ngo/dashboard" element={<ProtectedRoute allowedRoles={['ngo']}><NgoDashboard /></ProtectedRoute>} />

                    {/* ========================================== */}
                    {/* ADMIN ROUTES (LOCKED)                      */}
                    {/* ========================================== */}
                    <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/requests" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/alerts" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/tributes" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                    {/* Admin settings removed from routes */}

                    {/* 404 - Not Found */}
                    <Route path="/demo/payment" element={<PatientPaymentDemo />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </ChatProvider>
          </SharedChatProvider>
        </DonorProvider>
        </DotsProvider>
      </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;