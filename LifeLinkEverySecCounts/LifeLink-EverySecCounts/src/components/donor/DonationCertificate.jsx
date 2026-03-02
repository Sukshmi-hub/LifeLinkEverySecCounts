import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Award, Download, Building2, Calendar, User } from 'lucide-react';

const DonationCertificate = ({
  donorName,
  organType,
  hospitalName,
  patientName,
  donationDate,
  certificateId,
  onClose,
}) => {
  const handleDownload = () => {
    // Simulate PDF download - in real app would generate actual PDF
    const certificateContent = `
      CERTIFICATE OF ORGAN DONATION
      
      Certificate ID: ${certificateId}
      
      This is to certify that
      ${donorName}
      
      Has successfully donated
      ${organType}
      
      At ${hospitalName}
      On ${donationDate.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })}
      
      This act of selfless giving has saved a life.
      
      Certified by:
      LifeLink - Every Second Counts
      ${hospitalName}
    `;
    
    const blob = new Blob([certificateContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LifeLink_Donation_Certificate_${certificateId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white shadow-2xl">
        {/* Certificate Header */}
        <div className="bg-gradient-to-r from-primary to-destructive p-6 text-white text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <Award className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-wide">CERTIFICATE OF DONATION</h1>
          <p className="text-white/80 mt-2">LifeLink - Every Second Counts</p>
        </div>

        <CardContent className="p-8">
          {/* Certificate Body */}
          <div className="text-center space-y-6">
            <p className="text-muted-foreground text-lg">This is to certify that</p>
            
            <div className="py-4 border-b-2 border-primary/30">
              <h2 className="text-3xl font-bold text-primary">{donorName}</h2>
            </div>

            <p className="text-muted-foreground text-lg">has selflessly donated</p>

            <div className="flex justify-center">
              <div className="inline-flex items-center gap-3 bg-destructive/10 px-6 py-3 rounded-full">
                <Heart className="w-6 h-6 text-destructive" />
                <span className="text-2xl font-bold text-destructive">{organType}</span>
              </div>
            </div>

            <p className="text-muted-foreground text-lg">and saved a precious life</p>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 text-left">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Building2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Hospital</p>
                  <p className="font-semibold">{hospitalName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Date of Donation</p>
                  <p className="font-semibold">
                    {donationDate.toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <User className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Recipient</p>
                  <p className="font-semibold">{patientName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Award className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Certificate ID</p>
                  <p className="font-semibold text-xs">{certificateId}</p>
                </div>
              </div>
            </div>

            {/* Certification Footer */}
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Certified by</p>
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-destructive flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-semibold text-sm">LifeLink</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-primary flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-semibold text-sm">{hospitalName}</p>
                </div>
              </div>
            </div>

            {/* Inspirational Quote */}
            <div className="mt-6 p-4 bg-success/10 rounded-lg border border-success/20">
              <p className="text-success font-medium italic">
                "The gift of life is the most precious gift one can give."
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <Button 
              onClick={handleDownload}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Certificate
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DonationCertificate;