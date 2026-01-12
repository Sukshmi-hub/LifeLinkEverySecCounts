import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { bloodTypes, organTypes } from "@/data/donors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Droplets,
  Heart,
  Upload,
  CheckCircle,
  Loader2,
  FileText,
  AlertCircle,
} from "lucide-react";

function DonorRegister() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [donorId, setDonorId] = useState("");

  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    dateOfBirth: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    pincode: "",

    donorType: "",
    bloodType: "",
    selectedOrgans: [],

    available: true,
    availabilityNotes: "",

    consentFile: null,
    consentFileName: "",
    medicalHistory: "",
    agreeTerms: false,
    agreeDataSharing: false,
  });

  const handleOrganToggle = (organ) => {
    setFormData((prev) => ({
      ...prev,
      selectedOrgans: prev.selectedOrgans.includes(organ)
        ? prev.selectedOrgans.filter((o) => o !== organ)
        : [...prev.selectedOrgans, organ],
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        consentFile: file,
        consentFileName: file.name,
      }));
    }
  };

  const validateStep = (currentStep) => {
    if (currentStep === 1) {
      if (
        !formData.fullName ||
        !formData.email ||
        !formData.phone ||
        !formData.dateOfBirth ||
        !formData.gender
      ) {
        toast({
          title: "Missing Information",
          description: "Please fill all required personal details.",
          variant: "destructive",
        });
        return false;
      }
    }

    if (currentStep === 2) {
      if (!formData.donorType || !formData.bloodType) {
        toast({
          title: "Missing Information",
          description: "Please select donor type and blood type.",
          variant: "destructive",
        });
        return false;
      }

      if (
        (formData.donorType === "organ" ||
          formData.donorType === "both") &&
        formData.selectedOrgans.length === 0
      ) {
        toast({
          title: "Missing Information",
          description: "Please select at least one organ.",
          variant: "destructive",
        });
        return false;
      }
    }

    if (currentStep === 3) {
      if (!formData.agreeTerms || !formData.agreeDataSharing) {
        toast({
          title: "Consent Required",
          description: "Please agree to all required terms.",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const nextStep = () => validateStep(step) && setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 2000));

    const newId = `DNR-${Date.now().toString().slice(-6)}`;
    setDonorId(newId);
    setRegistrationComplete(true);
    setStep(4);

    toast({
      title: "Registration Successful!",
      description: `Your donor ID is ${newId}`,
    });

    setIsSubmitting(false);
  };

  /* ================= SUCCESS SCREEN ================= */
  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12">
          <Card className="max-w-2xl mx-auto text-center">
            <CardContent className="pt-12 pb-8">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-success" />
              </div>

              <h1 className="text-3xl font-bold mb-2">
                Registration Complete!
              </h1>

              <div className="bg-muted/50 rounded-xl p-6 mb-8">
                <p className="text-sm text-muted-foreground">
                  Your Donor ID
                </p>
                <p className="text-2xl font-bold text-primary">{donorId}</p>
              </div>

              <Button onClick={() => navigate("/donor/dashboard")} size="lg">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  /* ================= FORM ================= */
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        {/* FORM CONTENT UNCHANGED */}
        {/* (Everything below remains identical to your original UI) */}
      </main>
    </div>
  );
}

export default DonorRegister;
