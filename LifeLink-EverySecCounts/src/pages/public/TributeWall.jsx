import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  Flower2,
  CalendarDays,
  MapPin,
  Users,
  Plus,
  Send,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function TributeWall() {
  const { toast } = useToast();
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  
  const [tributes, setTributes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [formData, setFormData] = useState({
    donorName: "",
    donorAge: "",
    donorLocation: "",
    donationType: "",
    familyName: "",
    familyMessage: "",
    familyConsent: false,
    photo: null,
  });

  // Fetch public tributes on mount
  useEffect(() => {
    const fetchTributes = async () => {
      try {
        setIsLoading(true);
        const resp = await fetch(`${API_BASE}/api/tributes/public`);
        if (!resp.ok) throw new Error('Failed to fetch tributes');
        const json = await resp.json();
        if (json.success && Array.isArray(json.tributes)) {
          setTributes(json.tributes);
        }
      } catch (err) {
        console.error('Failed to fetch tributes:', err);
        setTributes([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTributes();
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setFormData({ ...formData, photo: file });

    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    await new Promise((r) => setTimeout(r, 1500));

    if (formData.familyConsent) {
      const newTribute = {
        id: `trib_${Date.now()}`,
        donorName: formData.donorName,
        donorAge: formData.donorAge
          ? parseInt(formData.donorAge)
          : undefined,
        donorLocation: formData.donorLocation,
        donationType: formData.donationType,
        familyName: formData.familyName,
        familyMessage: formData.familyMessage,
        photo: photoPreview || undefined,
        livesImpacted: Math.floor(Math.random() * 5) + 1,
        donationDate: new Date().toISOString().split("T")[0],
        familyConsent: true,
        status: "published",
        createdAt: new Date().toISOString(),
      };

      setTributes((prev) => [newTribute, ...prev]);
    }

    toast({
      title: "Tribute Submitted",
      description: formData.familyConsent
        ? "Your tribute is now visible on the wall."
        : "Your private tribute has been saved.",
    });

    setFormData({
      donorName: "",
      donorAge: "",
      donorLocation: "",
      donationType: "",
      familyName: "",
      familyMessage: "",
      familyConsent: false,
      photo: null,
    });

    setPhotoPreview(null);
    setDialogOpen(false);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* HERO */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full text-primary text-sm font-medium mb-6">
            <Flower2 className="h-4 w-4" />
            Honoring Our Heroes
          </div>

          <h1 className="text-4xl font-bold">Tribute Wall</h1>
          <p className="mt-4 text-muted-foreground">
            Honoring those who gave the gift of life.
          </p>

          <div className="mt-8 flex justify-center gap-10">
            <div>
              <p className="text-3xl font-bold text-primary">
                {tributes.length}
              </p>
              <p className="text-sm text-muted-foreground">Tributes</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">
                {tributes.length > 0 ? tributes.length * 2 : 0}+
              </p>
              <p className="text-sm text-muted-foreground">
                Lives Impacted
              </p>
            </div>
          </div>

          {/* hero submit button removed; submission available from hospital dashboard */}
        </div>
      </section>

      {/* TRIBUTE GRID */}
      <section className="py-12">
        <div className="container">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tributes && tributes.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tributes.map((t) => (
                <div
                  key={t._id || t.id}
                  className="rounded-2xl border bg-card p-6 hover:shadow-lg transition"
                >
                  <div className="flex gap-4">
                    {t.photoUrl ? (
                      <img
                        src={t.photoUrl}
                        alt={t.donorName}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Heart className="text-primary/50" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{t.donorName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {t.location}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground italic">
                    "{t.aboutDonor}"
                  </p>

                  <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                    <span>
                      <CalendarDays className="inline h-3 w-3 mr-1" />
                      {new Date(t.createdAt).toLocaleDateString('en-IN')}
                    </span>
                    <span className="text-primary">
                      <Heart className="inline h-3 w-3 mr-1" />
                      {t.donationType}
                    </span>
                  </div>

                  <p className="mt-3 text-xs italic text-muted-foreground">
                    — {t.hospitalName}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Heart className="h-12 w-12 mx-auto text-primary/30 mb-4" />
              <p className="text-muted-foreground">No tributes yet</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default TributeWall;
