import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import DashboardCard from "@/components/DashboardCard";
import { Button } from "@/components/ui/button";
import {
  Droplets,
  Heart,
  Search,
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
    // Load patient data from localStorage (reset for new patients)
    const storedData = localStorage.getItem("lifelink_patient_data");
    if (storedData) {
      const parsed = JSON.parse(storedData);
      setPatientData({
        activeRequests: parsed.activeRequests || 0,
        pending: parsed.pending || 0,
        matched: parsed.matched || 0,
        emergencies: parsed.emergencies || 0,
      });
    }
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/patient/request">
            <Button className="w-full h-24 flex-col gap-2">
              <Droplets className="h-6 w-6" />
              New Request
            </Button>
          </Link>

          <Link to="/patient/find-hospital">
            <Button
              variant="outline"
              className="w-full h-24 flex-col gap-2"
            >
              <Search className="h-6 w-6" />
              Find Hospital
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