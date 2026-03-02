import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

function HospitalPayments() {
  const { user } = useAuth()

  const [form, setForm] = useState({ razorpayLinkedAccountId: '', bankAccountHolderName: '', bankName: '', upiId: '' })
  const [hospitalId, setHospitalId] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [receivedRequests, setReceivedRequests] = useState([])

  const [showDetails, setShowDetails] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [paymentForm2, setPaymentForm2] = useState({ surgeryFee: '', hospitalCharges: '', processingFee: '' })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        const resp = await fetch('/api/hospital/me', { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        const j = await resp.json()
        if (!resp.ok) throw new Error(j.message || 'Failed to load')
        const data = j.data || {}
        setHospitalId(data.hospitalId || data._id || data.id || null)
        setForm({
          razorpayLinkedAccountId: data.razorpayLinkedAccountId || '',
          bankAccountHolderName: data.bankAccountHolderName || '',
          bankName: data.bankName || '',
          upiId: data.upiId || ''
        })
        if (data.hospitalId || data._id || data.id) fetchReceivedRequests(data.hospitalId || data._id || data.id)
      } catch (e) {
        console.error('Failed to load hospital payments config', e)
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  const fetchReceivedRequests = async (hid = null) => {
    try {
      console.debug('[HospitalPayments] fetchReceivedRequests called with hid=', hid, 'state.hospitalId=', hospitalId, new Date().toISOString())
      const token = localStorage.getItem('token')
      const idToUse = hid || hospitalId
      if (!idToUse) return
      const resp = await fetch(`/api/requests?hospitalId=${encodeURIComponent(idToUse)}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.message || 'Failed to load')
      const list = (json.data || []).filter(r => r.detailsSentToPatientHospital || !!r.matchedDonor || r.status === 'approved')
      setReceivedRequests(list)
    } catch (e) {
      console.error('Failed to fetch received requests', e)
    }
  }

  const save = async () => {
    setError(null)
    setSuccess(null)
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

  const openDetails = (req) => {
    setSelectedRequest(req)
    setShowDetails(true)
  }

  const handleOpenPayment = (req) => {
    setSelectedRequest(req)
    setPaymentForm2({ surgeryFee: 0, hospitalCharges: 0, processingFee: 0 })
    setShowPaymentModal(true)
  }

  const sendPaymentSummary = async () => {
    try {
      const token = localStorage.getItem('token')
      const body = {
        hospitalId: hospitalId,
        patientId: selectedRequest.patientId || (selectedRequest.patientId && selectedRequest.patientId._id) || selectedRequest.requestedBy || null,
        surgeryFee: Number(paymentForm2.surgeryFee || 0),
        hospitalCharges: Number(paymentForm2.hospitalCharges || 0),
        processingFee: Number(paymentForm2.processingFee || 0),
        requestId: selectedRequest._id || selectedRequest.id || null
      }
      const resp = await fetch('/api/payments/create-summary', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify(body) })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.message || 'Failed to send')
      toast.success('Payment summary has been successfully sent to the patient')
      setShowPaymentModal(false)
      // mark the specific row as summarySent so UI disables the button immediately
      setReceivedRequests(prev => prev.map(item => item._id === (selectedRequest._id || selectedRequest.id) ? { ...item, summarySent: true } : item))
      setSelectedRequest(null)
    } catch (e) {
      console.error('Failed to send payment summary', e)
      toast.error(e.message || 'Failed to send payment summary')
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

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Received Match Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {receivedRequests.length === 0 ? (
              <p className="text-muted-foreground">No received requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Patient Name</th>
                      <th className="py-2">Blood Group</th>
                      <th className="py-2">Organ Required</th>
                      <th className="py-2">Received From</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivedRequests.map((r) => {
                      const patientName = r.patientName || (r.patient && (r.patient.name || r.patient.fullName)) || (r.patientId && (r.patientId.name || r.patientId.user?.name)) || '—'
                      const bloodGroup = (r.patient && (r.patient.blood_type || r.patient.bloodType)) || r.bloodGroup || (r.raw && r.raw.patientBlood) || (r.patientId && (r.patientId.blood_type || r.patientId.bloodType)) || '—'
                      const organ = r.organ || r.organRequired || r.organType || (r.raw && r.raw.organ) || '—'
                      const receivedFrom = (r.matchedDonor && (r.matchedDonor.senderHospitalName || r.matchedDonor.hospitalName)) || (r.matchedDonor && r.matchedDonor.hospitalName) || '—'
                      const summarySent = !!r.summarySent || !!r.paymentSummarySent || !!r.summaryCreated || !!r.paymentSent || !!r.paymentId

                      return (
                        <tr key={r._id || r.id} className="border-b">
                          <td className="py-3">{patientName}</td>
                          <td className="py-3">{bloodGroup}</td>
                          <td className="py-3">{organ}</td>
                          <td className="py-3">{receivedFrom}</td>
                          <td className="py-3">
                            {!summarySent ? (
                              <>
                                <Button variant="ghost" onClick={() => openDetails(r)} title="View Details"><Eye className="w-4 h-4" /></Button>
                                <Button onClick={() => handleOpenPayment(r)} className="ml-2 bg-red-600 text-white">Generate Payment Summary</Button>
                              </>
                            ) : (
                              <span className="text-sm font-medium text-green-600">Summary Sent</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={val => { if (!val) setShowDetails(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div>
              <h4 className="font-semibold">Patient</h4>
              <p><strong>Name:</strong> {(selectedRequest.patientId && (selectedRequest.patientId.name || selectedRequest.patientId.user?.name)) || selectedRequest.patientName || 'Unknown'}</p>
              <p><strong>Blood Group:</strong> {(selectedRequest.patientId && (selectedRequest.patientId.blood_type || selectedRequest.patientId.bloodType)) || selectedRequest.bloodGroup || '—'}</p>
              <p><strong>Organ Required:</strong> {selectedRequest.organ || selectedRequest.organRequired || selectedRequest.organType || '—'}</p>
              <p><strong>Contact:</strong> {(selectedRequest.patientId && (selectedRequest.patientId.phone || selectedRequest.patientId.user?.phone)) || selectedRequest.contact || '—'}</p>
              <p><strong>Admitted Hospital:</strong> {(selectedRequest.hospital && selectedRequest.hospital.name) || selectedRequest.hospitalName || '—'}</p>

              <h4 className="font-semibold mt-3">Matched Donor</h4>
              <p><strong>Name:</strong> {(selectedRequest.matchedDonor && (selectedRequest.matchedDonor.name || selectedRequest.matchedDonor.raw?.name)) || '—'}</p>
              <p><strong>Blood Group:</strong> {(selectedRequest.matchedDonor && (selectedRequest.matchedDonor.bloodType || selectedRequest.matchedDonor.blood_type || selectedRequest.matchedDonor.raw?.blood_type)) || '—'}</p>
              <p><strong>Organ Available:</strong> {(selectedRequest.matchedDonor && (selectedRequest.matchedDonor.organOffered || selectedRequest.matchedDonor.raw?.organ)) || '—'}</p>
              <p><strong>Sent by Hospital:</strong> {(selectedRequest.matchedDonor && (selectedRequest.matchedDonor.senderHospitalName || selectedRequest.matchedDonor.hospitalName)) || '—'}</p>
              <p><strong>Date received:</strong> {selectedRequest.sentToPatientHospitalAt || selectedRequest.matchedAt || (selectedRequest.matchedDonor && selectedRequest.matchedDonor.raw && selectedRequest.matchedDonor.raw.matchedAt) || '—'}</p>

              <h4 className="font-semibold mt-3">Message</h4>
              <p>{selectedRequest.message || selectedRequest.details || ''}</p>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => setShowDetails(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Summary Dialog */}
      <Dialog open={showPaymentModal} onOpenChange={val => { if (!val) setShowPaymentModal(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Summary</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-3">
              <div>
                <Label>Patient</Label>
                <div className="font-medium">{(selectedRequest.patientId && (selectedRequest.patientId.name || selectedRequest.patientId.user?.name)) || selectedRequest.patientName || 'Unknown'}</div>
              </div>
              <div>
                <Label>Surgery Fee</Label>
                <Input type="number" value={paymentForm2.surgeryFee} onChange={e => setPaymentForm2(prev => ({ ...prev, surgeryFee: e.target.value }))} />
              </div>
              <div>
                <Label>Hospital Charges</Label>
                <Input type="number" value={paymentForm2.hospitalCharges} onChange={e => setPaymentForm2(prev => ({ ...prev, hospitalCharges: e.target.value }))} />
              </div>
              <div>
                <Label>Processing Fee</Label>
                <Input type="number" value={paymentForm2.processingFee} onChange={e => setPaymentForm2(prev => ({ ...prev, processingFee: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button onClick={sendPaymentSummary}>Send</Button>
                <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default HospitalPayments
