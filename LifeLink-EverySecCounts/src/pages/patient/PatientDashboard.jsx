import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import DashboardCard from "@/components/DashboardCard";
import { Button } from "@/components/ui/button";
import {
  Droplets,
  Heart,
  MessageCircle,
  CreditCard,
  AlertTriangle,
  FileText,
  Clock,
} from "lucide-react";

function PatientDashboard() {
  const { user } = useAuth();
  const [patientData, setPatientData] = useState({
    activeRequests: 0,
    pending: 0,
    matched: 0,
    emergencies: 0,
  });

  useEffect(() => {
    // Try to load dashboard counts from backend (fallback to localStorage)
    const loadCounts = async () => {
      try {
        const stored = localStorage.getItem('lifelink_auth')
        const parsed = stored ? JSON.parse(stored) : null
        const patientId = parsed?.user?.id
        if (patientId) {
          const res = await fetch(`http://localhost:5000/api/requests/dashboard?patientId=${encodeURIComponent(patientId)}`)
          const json = await res.json()
          if (json && json.success && json.data) {
            setPatientData({
              activeRequests: json.data.activeRequests || 0,
              pending: json.data.pending || 0,
              matched: json.data.matched || 0,
              emergencies: json.data.emergencies || 0,
            })
            return
          }
        }
        // fallback to localStorage legacy data
        const storedData = localStorage.getItem("lifelink_patient_data");
        if (storedData) {
          const parsed2 = JSON.parse(storedData);
          setPatientData({
            activeRequests: parsed2.activeRequests || 0,
            pending: parsed2.pending || 0,
            matched: parsed2.matched || 0,
            emergencies: parsed2.emergencies || 0,
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard counts:', err)
      }
    }
    loadCounts()
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {user?.name}
          </h1>
          <p className="text-muted-foreground">
            Manage your health requests and find the help you need.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <DashboardCard
            icon={FileText}
            title="Active Requests"
            value={String(patientData.activeRequests)}
            variant="primary"
          />
          <DashboardCard
            icon={Clock}
            title="Pending"
            value={String(patientData.pending)}
            variant="warning"
          />
          <DashboardCard
            icon={Heart}
            title="Matched"
            value={String(patientData.matched)}
            variant="success"
          />
          <DashboardCard
            icon={AlertTriangle}
            title="Emergencies"
            value={String(patientData.emergencies)}
            variant="critical"
          />
        </div>

        <h2 className="text-xl font-semibold mb-4">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link to="/patient/request">
            <Button className="w-full h-24 flex-col gap-2">
              <Droplets className="h-6 w-6" />
              New Request
            </Button>
          </Link>

          <Link to="/patient/messages">
            <Button
              variant="outline"
              className="w-full h-24 flex-col gap-2"
            >
              <MessageCircle className="h-6 w-6" />
              Messages
            </Button>
          </Link>

          <Link to="/patient/payment">
            <Button
              variant="outline"
              className="w-full h-24 flex-col gap-2"
            >
              <CreditCard className="h-6 w-6" />
              Payments
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default PatientDashboard;