import React, { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { serverUrl } from '@/lib/serverConfig';

const ForgotPasswordModal = ({ open, onOpenChange }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const sendReset = async () => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast({ title: 'Invalid Email', description: 'Enter a valid email address', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${serverUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const body = await res.json()
      if (res.ok) {
        // Show generic success or dev resetLink if returned
        if (body.resetLink) {
          toast({ title: 'Reset Link (dev)', description: body.resetLink })
        } else {
          toast({ title: 'Email Sent', description: 'If that email exists, a reset link was sent.' })
        }
        onOpenChange(false)
        setEmail('')
      } else {
        throw new Error(body.message || 'Failed to request reset')
      }
    } catch (err) {
      console.error('sendPasswordResetEmail error', err)
      toast({ title: 'Error', description: err.message || 'Failed to send reset email', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const close = () => {
    onOpenChange(false)
    setTimeout(() => setEmail(''), 200)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Forgot Password</DialogTitle>
          <DialogDescription>
            Enter your email and we'll send a password reset link via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="email">Email</Label>
            <div className="flex gap-2">
              <Input id="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button onClick={sendReset} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : 'Send Email'}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ForgotPasswordModal;
