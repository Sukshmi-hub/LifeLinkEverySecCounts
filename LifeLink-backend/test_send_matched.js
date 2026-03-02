(async () => {
  try {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTk1ZWQyMWJhNGExMmRlZDM3MmE0NTciLCJpYXQiOjE3NzIzNzEzMTQsImV4cCI6MTc3Mjk3NjExNH0.5Li_LpGkTISc6rykLhsclELqfS_E6cNb33-GdtLIg80';
    const requestId = '69a43d65dbedb8071a26472e';
    const donor = {
      files: { medicalReports: ['/uploads/requests/1772306783798-Signature.jpeg','/uploads/requests/1772306783801-Signature.jpeg'], additional: [], idProof: '/uploads/requests/1772306783802-Signature.jpeg' },
      breakdown: { transplantFee: 0, hospitalCharges: 0, processingFee: 0 },
      _id: '69a3415f5a63ce81701ee928',
      requestType: 'donor_registration',
      status: 'approved',
      donorId: {
        location: { city: 'बनस्थली', country: 'India', full_address: 'Banasthali Vidyapeeth, बनस्थली, Niwai Tehsil, Tonk, Rajasthan, 304022, India', latitude: 26.39815877825911, longitude: 75.87688613769576, state: 'Rajasthan' },
        emergency_contact: { name: 'Sunita Verma', phone: '9012345678' },
        _id: '6995f0b13f7f32d8a1179aa5', aadhaar_no: '56789123456', address: 'Banasthali Vidyapeeth, बनस्थली, Niwai Tehsil, Tonk, Rajasthan, 304022, India', age: 25, blood_type: 'A+', donation_type: [], email: 'priya@gmail.com', name: 'Priya Verma', phone: '9123456780', fullName: 'Priya Verma', bloodGroup: 'A+', aadhaarNumber: '56789123456', emergencyContactName: 'Sunita Verma', emergencyPhone: '9012345678', id: '6995f0b13f7f32d8a1179aa5'
      },
      hospitalId: '6995ed213f7f32d8a1179a9d',
      requestedBy: '6995f0b1ba4a12ded372a49e',
      urgency: 'medium', organType: 'Lung', message: 'Donor intent for Lung', amount: 0, ngoId: null, ngoName: '', transplantFee: 0, hospitalCharges: 0, processingFee: 0, paymentSent: false, paymentId: null, matchedDonor: null, detailsSentToPatientHospital: false
    };

    const resp = await fetch(`http://localhost:5000/api/requests/${requestId}/send-matched-details`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ donor })
    });
    const text = await resp.text();
    console.log('STATUS', resp.status);
    console.log('BODY', text);
  } catch (err) {
    console.error('REQUEST FAILED', err && err.stack ? err.stack : err);
  }
})();
