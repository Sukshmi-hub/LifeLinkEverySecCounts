import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'

const HospitalPayments = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    razorpayLinkedAccountId: '',
    bankAccountHolderName: '',
    bankName: '',
    upiId: ''
  })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        const resp = await fetch('/api/hospital/me', { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        const j = await resp.json()
        if (!resp.ok) throw new Error(j.message || 'Failed to load')
        const data = j.data || {}
        setForm({
          razorpayLinkedAccountId: data.razorpayLinkedAccountId || '',
          bankAccountHolderName: data.bankAccountHolderName || '',
          bankName: data.bankName || '',
          upiId: data.upiId || ''
        })
      } catch (e) {
        console.error('Failed to load hospital payments config', e)
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  const save = async () => {
    setError(null)
    setSuccess(null)
    // Validate required fields
    if (!form.razorpayLinkedAccountId || !form.razorpayLinkedAccountId.trim()) {
      setError('Razorpay Linked Account ID is required')
      return
    }
    try {
      const token = localStorage.getItem('token')
      const resp = await fetch('/api/hospital/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify(form)
      })
      const j = await resp.json()
      if (!resp.ok) throw new Error(j.message || 'Save failed')
      setSuccess('Saved successfully')
      setEditing(false)
    } catch (e) {
      console.error('Save failed', e)
      setError(e.message || 'Save failed')
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Payments</h2>
      <Card>
        <CardHeader>
          <CardTitle>Payment Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Razorpay Linked Account ID *</Label>
                <Input
                  required
                  aria-required="true"
                  value={form.razorpayLinkedAccountId}
                  onChange={e => setForm(prev => ({ ...prev, razorpayLinkedAccountId: e.target.value }))}
                  disabled={!editing && form.razorpayLinkedAccountId}
                />
              </div>
              <div>
                <Label>Bank Account Holder Name</Label>
                <Input value={form.bankAccountHolderName} onChange={e => setForm(prev => ({ ...prev, bankAccountHolderName: e.target.value }))} disabled={!editing} />
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input value={form.bankName} onChange={e => setForm(prev => ({ ...prev, bankName: e.target.value }))} disabled={!editing} />
              </div>
              <div>
                <Label>UPI ID</Label>
                <Input value={form.upiId} onChange={e => setForm(prev => ({ ...prev, upiId: e.target.value }))} disabled={!editing} />
              </div>

              {error && <p className="text-destructive">{error}</p>}
              {success && <p className="text-success">{success}</p>}

              <div className="flex gap-2">
                {!editing ? (
                  <Button onClick={() => setEditing(true)}>Edit</Button>
                ) : (
                  <>
                    <Button onClick={save}>Save</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default HospitalPayments
