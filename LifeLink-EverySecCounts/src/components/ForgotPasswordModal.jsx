import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';
import { serverUrl } from '@/lib/serverConfig';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth } from '@/firebase'

const ForgotPasswordModal = ({ open, onOpenChange }) => {
  const [stage, setStage] = useState(1); // 1: phone, 2: otp, 3: reset
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

  const sendOTP = async () => {
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      toast({ title: 'Invalid Phone', description: 'Enter a 10-digit phone number', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        { size: 'invisible' }
      );
      const phoneWithCode = '+91' + phone;
      const confirmation = await signInWithPhoneNumber(auth, phoneWithCode, window.recaptchaVerifier);
      window.confirmationResult = confirmation;
      setStage(2);
      setOtp('');
      setOtpTimer(30);
      toast({ title: 'OTP Sent', description: 'Enter the 6-digit code received via SMS.' });
    } catch (err) {
      console.error('sendOTP error', err);
      toast({ title: 'Error', description: 'Failed to send OTP. Check Firebase config and console.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({ title: 'Invalid OTP', description: 'Enter a 6-digit OTP', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const result = await window.confirmationResult.confirm(otp);
      if (result.user) {
        setStage(3);
        toast({ title: 'OTP Verified', description: 'You may set a new password now.' });
      }
    } catch (err) {
      console.error('verifyOTP error', err);
      toast({ title: 'Error', description: 'Incorrect OTP. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    // Reset invisible reCAPTCHA and resend
    try {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (e) {}
      }
    } catch (e) {}
    await sendOTP();
  };

  const resetPassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${serverUrl}/api/auth/reset-password-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Password reset successfully. Please login.' });
        // close modal and reset
        onOpenChange(false);
        setStage(1);
        setPhone('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to reset password', variant: 'destructive' });
      }
    } catch (err) {
      console.error('resetPassword error', err);
      toast({ title: 'Error', description: 'Server error. Try again later.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStage(1);
      setPhone('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Forgot Password</DialogTitle>
          <DialogDescription>
            Reset using your phone number via OTP. Follow the steps.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div id="recaptcha-container"></div>

          {stage === 1 && (
            <div className="space-y-3">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <Input id="phone" placeholder="10-digit phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0,10))} maxLength={10} />
                <Button onClick={sendOTP} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : 'Send OTP'}</Button>
              </div>
            </div>
          )}

          {stage === 2 && (
            <div className="space-y-3">
              <Label htmlFor="otp">Enter OTP</Label>
              <div className="flex gap-2">
                <Input id="otp" placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))} maxLength={6} />
                <Button onClick={verifyOTP} disabled={loading || otp.length !== 6}>{loading ? <Loader2 className="animate-spin" /> : 'Verify OTP'}</Button>
              </div>
              <div className="text-sm">
                {otpTimer > 0 ? (
                  <span>Resend OTP in {otpTimer}s</span>
                ) : (
                  <button type="button" className="text-blue-600 hover:underline" onClick={resendOTP}>Resend OTP</button>
                )}
              </div>
            </div>
          )}

          {stage === 3 && (
            <div className="space-y-3">
              <Label>Set New Password</Label>
              <Input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <Input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <Button className="w-full" onClick={resetPassword} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : 'Reset Password'}</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordModal;
