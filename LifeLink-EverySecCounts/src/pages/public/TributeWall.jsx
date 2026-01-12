import React, { useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getPublishedTributes, getTributeStats } from "@/data/tributes";
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

  const [tributes, setTributes] = useState(getPublishedTributes());
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

  const stats = getTributeStats();

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
                {stats.published}
              </p>
              <p className="text-sm text-muted-foreground">Tributes</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">
                {stats.livesImpacted}+
              </p>
              <p className="text-sm text-muted-foreground">
                Lives Impacted
              </p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="mt-8 gap-2">
                <Plus className="h-4 w-4" />
                Submit a Tribute
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg bg-background">
              <DialogHeader>
                <DialogTitle>Submit a Tribute</DialogTitle>
                <DialogDescription>
                  Tributes with consent will be published publicly.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <Input
                  placeholder="Donor Name"
                  value={formData.donorName}
                  onChange={(e) =>
                    setFormData({ ...formData, donorName: e.target.value })
                  }
                  required
                />

                <Input
                  type="number"
                  placeholder="Age (optional)"
                  value={formData.donorAge}
                  onChange={(e) =>
                    setFormData({ ...formData, donorAge: e.target.value })
                  }
                />

                <Input
                  placeholder="Location"
                  value={formData.donorLocation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      donorLocation: e.target.value,
                    })
                  }
                  required
                />

                <Input
                  placeholder="Donation Type"
                  value={formData.donationType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      donationType: e.target.value,
                    })
                  }
                  required
                />

                <Input
                  placeholder="Family Name"
                  value={formData.familyName}
                  onChange={(e) =>
                    setFormData({ ...formData, familyName: e.target.value })
                  }
                  required
                />

                <Textarea
                  placeholder="Family Message"
                  rows={4}
                  value={formData.familyMessage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      familyMessage: e.target.value,
                    })
                  }
                  required
                />

                {/* Photo */}
                <div className="border-dashed border-2 rounded-xl p-6 text-center">
                  <input
                    type="file"
                    id="photo"
                    hidden
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                  <label htmlFor="photo" className="cursor-pointer">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="preview"
                        className="w-24 h-24 mx-auto rounded-xl object-cover"
                      />
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p>Upload Photo (optional)</p>
                      </>
                    )}
                  </label>
                </div>

                <div className="flex items-center justify-between border p-4 rounded-lg">
                  <div>
                    <p className="font-medium">Publish Tribute</p>
                    <p className="text-sm text-muted-foreground">
                      Display publicly
                    </p>
                  </div>
                  <Switch
                    checked={formData.familyConsent}
                    onCheckedChange={(v) =>
                      setFormData({ ...formData, familyConsent: v })
                    }
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* TRIBUTE GRID */}
      <section className="py-12">
        <div className="container grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tributes.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border bg-card p-6 hover:shadow-lg transition"
            >
              <div className="flex gap-4">
                {t.photo ? (
                  <img
                    src={t.photo}
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
                    {t.donorLocation}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground italic">
                “{t.familyMessage}”
              </p>

              <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                <span>
                  <CalendarDays className="inline h-3 w-3 mr-1" />
                  {new Date(t.donationDate).toLocaleDateString()}
                </span>
                <span className="text-primary">
                  <Users className="inline h-3 w-3 mr-1" />
                  {t.livesImpacted} lives
                </span>
              </div>

              <p className="mt-3 text-xs italic text-muted-foreground">
                — {t.familyName}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default TributeWall;
