import React, { useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  AlertTriangle,
  MapPin,
  Clock,
  Droplets,
  Heart,
  Building2,
  CheckCircle,
  X,
  Phone,
  User,
  FileText,
} from "lucide-react";

/* ---------------- MOCK DATA ---------------- */

const mockAlerts = [
  {
    id: "alert_001",
    type: "blood",
    urgency: "critical",
    bloodType: "A-",
    hospitalName: "City General Hospital",
    hospitalLocation: "Downtown, New York",
    distance: "2.5 km",
    patientInfo: "Emergency surgery patient, requires 2 units",
    requestId: "REQ-789456",
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60000).toISOString(),
    status: "pending",
  },
  {
    id: "alert_002",
    type: "organ",
    urgency: "high",
    organType: "Kidney",
    hospitalName: "Metropolitan Medical Center",
    hospitalLocation: "Midtown, New York",
    distance: "5.8 km",
    patientInfo: "Kidney transplant candidate, waiting for 2 years",
    requestId: "REQ-123789",
    createdAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60000).toISOString(),
    status: "pending",
  },
  {
    id: "alert_003",
    type: "blood",
    urgency: "normal",
    bloodType: "O+",
    hospitalName: "Community Health Center",
    hospitalLocation: "Brooklyn, New York",
    distance: "8.2 km",
    patientInfo: "Scheduled surgery, requires 1 unit",
    requestId: "REQ-456123",
    createdAt: new Date(Date.now() - 5 * 60 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 48 * 60 * 60000).toISOString(),
    status: "accepted",
  },
];

/* ---------------- COMPONENT ---------------- */

function DonorAlerts() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState(mockAlerts);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    alertId: "",
    action: "accept",
  });

  const handleAction = (alertId, action) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              status:
                action === "accept"
                  ? "accepted"
                  : "declined",
            }
          : alert
      )
    );

    toast({
      title:
        action === "accept"
          ? "Request Accepted!"
          : "Request Declined",
      description:
        action === "accept"
          ? "The hospital has been notified. They will contact you shortly."
          : "The request has been declined.",
    });

    setConfirmDialog({
      open: false,
      alertId: "",
      action: "accept",
    });
    setSelectedAlert(null);
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "critical":
        return "bg-destructive text-destructive-foreground";
      case "high":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTimeAgo = (date) => {
    const minutes = Math.floor(
      (Date.now() - new Date(date).getTime()) /
        60000
    );
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const pendingAlerts = alerts.filter(
    (a) => a.status === "pending"
  );
  const respondedAlerts = alerts.filter(
    (a) => a.status !== "pending"
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            Donation Alerts
          </h1>
          <p className="text-muted-foreground mt-1">
            View and respond to donation requests in your
            area
          </p>
        </div>

        {/* PENDING ALERTS */}
        {pendingAlerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Active Requests ({pendingAlerts.length})
            </h2>

            <div className="grid gap-4">
              {pendingAlerts.map((alert) => (
                <Card
                  key={alert.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() =>
                    setSelectedAlert(alert)
                  }
                >
                  <CardContent className="pt-6">
                    <div className="flex justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">
                          {alert.type === "blood"
                            ? `${alert.bloodType} Blood Needed`
                            : `${alert.organType} Donor Needed`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {alert.hospitalName} •{" "}
                          {getTimeAgo(alert.createdAt)}
                        </p>
                      </div>
                      <Badge
                        className={getUrgencyColor(
                          alert.urgency
                        )}
                      >
                        {alert.urgency.toUpperCase()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {alerts.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                No Alerts
              </h3>
              <p className="text-muted-foreground">
                You don’t have any donation alerts right
                now.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* DETAILS DIALOG */}
      <Dialog
        open={!!selectedAlert}
        onOpenChange={() =>
          setSelectedAlert(null)
        }
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              Request ID:{" "}
              {selectedAlert?.requestId}
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <p>
                <strong>Hospital:</strong>{" "}
                {selectedAlert.hospitalName}
              </p>
              <p>
                <strong>Patient:</strong>{" "}
                {selectedAlert.patientInfo}
              </p>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    setConfirmDialog({
                      open: true,
                      alertId: selectedAlert.id,
                      action: "decline",
                    })
                  }
                >
                  Decline
                </Button>
                <Button
                  className="flex-1"
                  onClick={() =>
                    setConfirmDialog({
                      open: true,
                      alertId: selectedAlert.id,
                      action: "accept",
                    })
                  }
                >
                  Accept
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open &&
          setConfirmDialog({
            open: false,
            alertId: "",
            action: "accept",
          })
        }
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === "accept"
                ? "Accept Request?"
                : "Decline Request?"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === "accept"
                ? "The hospital will be notified."
                : "This request will be declined."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                setConfirmDialog({
                  open: false,
                  alertId: "",
                  action: "accept",
                })
              }
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() =>
                handleAction(
                  confirmDialog.alertId,
                  confirmDialog.action
                )
              }
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DonorAlerts;
