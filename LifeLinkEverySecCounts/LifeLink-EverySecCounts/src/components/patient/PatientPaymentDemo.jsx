import React, { useState } from 'react'
import RazorpayModal from './RazorpayModal'
import { Button } from '@/components/ui/button'

const demo = {
  patientId: '000000000000000000000000',
  hospitalId: '6995eba868cd8a05bb519204',
  hospitalName: 'Demo Hospital',
  donorName: 'Demo Donor',
  organType: 'Heart',
  amount: 100
}

export default function PatientPaymentDemo() {
  const [open, setOpen] = useState(false)
  return (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-lg font-semibold mb-4">Patient Payment Demo</h2>
      <div className="space-y-2 mb-4">
        <div><strong>Hospital:</strong> {demo.hospitalName}</div>
        <div><strong>Donor:</strong> {demo.donorName}</div>
        <div><strong>Organ:</strong> {demo.organType}</div>
        <div><strong>Amount:</strong> ₹{demo.amount}</div>
      </div>
      <Button onClick={() => setOpen(true)}>Pay ₹{demo.amount}</Button>

      <RazorpayModal
        isOpen={open}
        onClose={() => setOpen(false)}
        donorName={demo.donorName}
        organType={demo.organType}
        hospitalName={demo.hospitalName}
        amount={demo.amount}
        hospitalId={demo.hospitalId}
        requestId={''}
      />
    </div>
  )
}
