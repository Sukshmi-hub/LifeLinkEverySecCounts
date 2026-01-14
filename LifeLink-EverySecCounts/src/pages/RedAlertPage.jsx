import React, { useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RedAlertModal from "@/components/RedAlertModal";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  AlertTriangle,
  Siren,
  Phone,
  MapPin,
  Clock,
  Droplets,
  Heart,
  Building2,
  CheckCircle,
} from "lucide-react";

/* ---------- MOCK DATA ---------- */

/* ---------- MOCK DATA (INDIAN CONTEXT) ---------- */

const mockAlerts = [
  {
    id: "ra_001",
    type: "blood",
    bloodType: "O-",
    hospitalName: "City Care Hospital",
    hospitalLocation: "Civil Lines, Kanpur, Uttar Pradesh",
    patientInfo:
      "Critical road accident victim, needs immediate O- blood transfusion",
    contactNumber: "+91 98765 43210",
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    status: "active",
    respondersCount: 3,
  },
  {
    id: "ra_002",
    type: "organ",
    organType: "Kidney",
    hospitalName: "Metro Life Hospital",
    hospitalLocation: "Gomti Nagar, Lucknow, Uttar Pradesh",
    patientInfo:
      "Patient in critical need of kidney transplant, compatibility confirmed",
    contactNumber: "+91 91234 56789",
    createdAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    status: "active",
    respondersCount: 1,
  },
  {
    id: "ra_003",
    type: "blood",
    bloodType: "AB-",
    hospitalName: "Seva Multispeciality Hospital",
    hospitalLocation: "Kalyanpur, Kanpur, Uttar Pradesh",
    patientInfo: "Scheduled surgery patient, rare blood group urgently required",
    contactNumber: "+91 99887 66554",
    createdAt: new Date(Date.now() - 5 * 60 * 60000).toISOString(),
    status: "resolved",
    respondersCount: 5,
  },
];


/* ---------- COMPONENT ---------- */

function RedAlertPage() {
  const [alerts] = useState(mockAlerts);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const activeAlerts = alerts.filter((a) => a.status === "active");
  const resolvedAlerts = alerts.filter((a) => a.status !== "active");

  const getTimeAgo = (date) => {
    const minutes = Math.floor(
      (Date.now() - new Date(date).getTime()) / 60000
    );
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Siren className="h-8 w-8 text-destructive" />
              Red Alert System
            </h1>
            <p className="text-muted-foreground mt-1">
              Emergency medical situations requiring immediate response
            </p>
          </div>
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {activeAlerts.length} Active Alerts
          </Badge>
        </div>

        {/* Emergency Notice */}
        <div className="mb-8 p-6 rounded-2xl bg-destructive/10 border border-destructive/30">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-destructive">
              <AlertTriangle className="h-6 w-6 text-destructive-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Emergency Response Protocol
              </h2>
              <p className="text-muted-foreground mt-1">
                Red Alerts are for critical, life-threatening situations only.
                Your quick action can save a life.
              </p>
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              Active Emergencies ({activeAlerts.length})
            </h2>

            <div className="grid gap-4">
              {activeAlerts.map((alert) => (
                <Card
                  key={alert.id}
                  className="border-l-4 border-l-destructive cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => setSelectedAlert(alert)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-4 rounded-xl bg-destructive/10 animate-pulse">
                          {alert.type === "blood" ? (
                            <Droplets className="h-8 w-8 text-destructive" />
                          ) : (
                            <Heart className="h-8 w-8 text-destructive" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold text-foreground">
                              {alert.type === "blood"
                                ? `${alert.bloodType} Blood`
                                : alert.organType}{" "}
                              URGENTLY NEEDED
                            </h3>
                            <Badge variant="destructive">CRITICAL</Badge>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {alert.hospitalName}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {alert.hospitalLocation}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {getTimeAgo(alert.createdAt)}
                            </span>
                          </div>

                          <p className="mt-2 text-foreground">
                            {alert.patientInfo}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Button variant="emergency" size="lg">
                          <Phone className="h-4 w-4 mr-2" />
                          Respond Now
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {alert.respondersCount} responders
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Resolved Alerts */}
        {resolvedAlerts.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-5 w-5 text-success" />
              Resolved Alerts
            </h2>

            <div className="grid gap-4">
              {resolvedAlerts.map((alert) => (
                <Card
                  key={alert.id}
                  className="opacity-75 border-l-4 border-l-success"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-success/10">
                          <CheckCircle className="h-6 w-6 text-success" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {alert.type === "blood"
                              ? `${alert.bloodType} Blood`
                              : alert.organType}{" "}
                            - {alert.hospitalName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Resolved • {alert.respondersCount} donors responded
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-success border-success"
                      >
                        RESOLVED
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      {selectedAlert && (
        <RedAlertModal
          open={true}
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      )}
    </div>
  );
}

export default RedAlertPage;
