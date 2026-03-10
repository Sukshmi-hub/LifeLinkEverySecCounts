import React, { useState, useEffect } from "react"; // Added useEffect for real data fetching
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
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
  Award,
} from "lucide-react";

/* ---------------- COMPONENT ---------------- */

function DonorAlerts() {
  const { toast } = useToast();
  
  // DUMMY DATA REMOVED: Initializing with an empty array
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    alertId: "",
    action: "accept",
  });

  // NOTE: This is where you would fetch your real data
  /*
  useEffect(() => {
    const fetchAlerts = async () => {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      setAlerts(data);
    };
    fetchAlerts();
  }, []);
  */

  const handleAction = (alertId, action) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              status: action === "accept" ? "accepted" : "declined",
            }
          : alert
      )
    );

    toast({
      title: action === "accept" ? "Request Accepted!" : "Request Declined",
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
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const pendingAlerts = alerts.filter((a) => a.status === "pending");

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
            View and respond to donation requests in your area
          </p>
        </div>

        {/* ACTIVE REQUESTS */}
        {pendingAlerts.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Active Requests ({pendingAlerts.length})
            </h2>

            <div className="grid gap-4">
              {pendingAlerts.map((alert) => (
                <Card
                  key={alert.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedAlert(alert)}
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
                          {alert.hospitalName} • {getTimeAgo(alert.createdAt)}
                        </p>
                      </div>
                      <Badge className={getUrgencyColor(alert.urgency)}>
                        {alert.urgency.toUpperCase()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* EMPTY STATE - Shows when no alerts exist */
          <Card className="text-center py-12">
            <CardContent>
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No Alerts</h3>
              <p className="text-muted-foreground">
                You don’t have any donation alerts right now.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* DETAILS DIALOG */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              Request ID: {selectedAlert?.requestId}
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <p>
                <strong>Hospital:</strong> {selectedAlert.hospitalName}
              </p>
              <p>
                <strong>Patient:</strong> {selectedAlert.patientInfo}
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
              {confirmDialog.action === "accept" ? "Accept Request?" : "Decline Request?"}
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
                handleAction(confirmDialog.alertId, confirmDialog.action)
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