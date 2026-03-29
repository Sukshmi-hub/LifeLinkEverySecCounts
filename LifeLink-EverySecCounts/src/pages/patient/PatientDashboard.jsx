import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Droplets,
  Heart,
  MessageCircle,
  CreditCard,
  FileText,
  Clock,
} from "lucide-react";
import { AlertTriangle } from "lucide-react";

function PatientDashboard() {
  const { user } = useAuth();
  const { organRequests, loadOrganRequests } = useNotifications();
  const [patientData, setPatientData] = useState({
    activeRequests: 0,
    pending: 0,
    matched: 0,
    emergencies: 0,
  });

  useEffect(() => {
    if (user?.id && typeof loadOrganRequests === 'function') {
      loadOrganRequests(user.id);
    }
  }, [user?.id, loadOrganRequests]);

  useEffect(() => {
    const patientRequests = Array.isArray(organRequests)
      ? organRequests.filter(r => String(r.patientId || '') === String(user?.id || '') || String(r.patientName || '') === String(user?.name || ''))
      : [];
    const matchedCount = patientRequests.filter(r => {
      const status = String(r.status || '').toLowerCase();
      return status.includes('matched') || status === 'accepted';
    }).length;
    const pendingCount = patientRequests.filter(r => {
      const status = String(r.status || '').toLowerCase();
      return !status.includes('matched') && status !== 'accepted' && status !== 'rejected';
    }).length;

    setPatientData({
      activeRequests: patientRequests.length,
      pending: pendingCount,
      matched: matchedCount,
      emergencies: 0,
    });
  }, [organRequests, user?.id]);

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

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="border-none bg-primary/5 shadow-none">
            <CardContent className="flex items-center gap-4 p-6">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{String(patientData.activeRequests)}</p>
                <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Total</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-warning/5 shadow-none">
            <CardContent className="flex items-center gap-4 p-6">
              <Clock className="w-8 h-8 text-warning" />
              <div>
                <p className="text-2xl font-bold">{String(patientData.pending)}</p>
                <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Pending</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-success/5 shadow-none">
            <CardContent className="flex items-center gap-4 p-6">
              <Heart className="w-8 h-8 text-success" />
              <div>
                <p className="text-2xl font-bold">{String(patientData.matched)}</p>
                <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Matched</p>
              </div>
            </CardContent>
          </Card>
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
