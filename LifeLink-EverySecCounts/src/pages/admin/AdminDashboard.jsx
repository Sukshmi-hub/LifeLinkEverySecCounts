import React from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import DashboardCard from "@/components/DashboardCard";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  Bell,
  Award,
  Shield,
  Activity,
} from "lucide-react";

function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            System overview and management
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <DashboardCard
            icon={Users}
            title="Total Users"
            value="1,234"
            variant="primary"
          />
          <DashboardCard
            icon={FileText}
            title="Active Requests"
            value="89"
            variant="warning"
          />
          <DashboardCard
            icon={Bell}
            title="Pending Alerts"
            value="5"
            variant="critical"
          />
          <DashboardCard
            icon={Activity}
            title="System Health"
            value="98%"
            variant="success"
          />
        </div>

        <h2 className="text-xl font-semibold mb-4">Management</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Link to="/admin/users">
            <Button className="w-full h-20 flex-col gap-2">
              <Users className="h-5 w-5" />
              Users
            </Button>
          </Link>

          <Link to="/admin/requests">
            <Button
              variant="outline"
              className="w-full h-20 flex-col gap-2"
            >
              <FileText className="h-5 w-5" />
              Requests
            </Button>
          </Link>

          <Link to="/admin/alerts">
            <Button
              variant="outline"
              className="w-full h-20 flex-col gap-2"
            >
              <Bell className="h-5 w-5" />
              Alerts
            </Button>
          </Link>

          <Link to="/admin/tributes">
            <Button
              variant="outline"
              className="w-full h-20 flex-col gap-2"
            >
              <Award className="h-5 w-5" />
              Tributes
            </Button>
          </Link>

          <Button
            variant="ghost"
            className="w-full h-20 flex-col gap-2"
          >
            <Shield className="h-5 w-5" />
            Settings
          </Button>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
