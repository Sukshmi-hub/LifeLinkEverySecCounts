import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Phone,
  Clock,
  X,
  Droplets,
  Heart,
  Building2,
  Siren,
} from "lucide-react";

function RedAlertModal({ open, onClose, alert }) {
  if (!alert) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg bg-background p-0 overflow-hidden">
        {/* Emergency Header */}
        <div className="bg-destructive p-6 text-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1)_0%,_transparent_70%)]" />

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-destructive-foreground hover:bg-destructive-foreground/10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-destructive-foreground/10 flex items-center justify-center animate-pulse">
              <Siren className="h-10 w-10 text-destructive-foreground" />
            </div>

            <h2 className="text-2xl font-bold text-destructive-foreground flex items-center justify-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              RED ALERT
              <AlertTriangle className="h-6 w-6" />
            </h2>

            <p className="text-destructive-foreground/80 mt-2">
              Emergency Medical Situation
            </p>
          </div>
        </div>

        {/* Alert Details */}
        <div className="p-6 space-y-6">
          {/* Request Type */}
          <div className="text-center">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                alert.type === "blood"
                  ? "bg-primary/10 text-primary"
                  : "bg-success/10 text-success"
              }`}
            >
              {alert.type === "blood" ? (
                <>
                  <Droplets className="h-5 w-5" />
                  <span className="font-bold text-lg">
                    {alert.bloodType} Blood Needed
                  </span>
                </>
              ) : (
                <>
                  <Heart className="h-5 w-5" />
                  <span className="font-bold text-lg">
                    {alert.organType} Donor Needed
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50">
              <Building2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground">
                  {alert.hospitalName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {alert.hospitalLocation}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-foreground">
                  Patient Information
                </p>
                <p className="text-sm text-muted-foreground">
                  {alert.patientInfo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Alert Raised</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(alert.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-destructive/10 rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-2">
              Emergency Contact
            </p>
            <a
              href={`tel:${alert.contactNumber}`}
              className="flex items-center gap-3 text-lg font-bold text-destructive"
            >
              <Phone className="h-5 w-5" />
              {alert.contactNumber}
            </a>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Close Alert
            </Button>
            <Button variant="emergency" className="flex-1">
              <Phone className="h-4 w-4 mr-2" />
              Call Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RedAlertModal;
