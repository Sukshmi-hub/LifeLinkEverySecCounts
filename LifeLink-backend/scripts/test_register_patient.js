#!/usr/bin/env node
// test_register_patient.js
// Creates a test patient via API and then inspects the Patient and Request docs

import dotenv from 'dotenv';
dotenv.config();

import fetch from 'node-fetch';
import { connectDB } from '../src/config/mongodb.js';
import Patient from '../src/models/Patient.js';
import Request from '../src/models/Request.js';

const server = process.env.SERVER_URL || 'http://localhost:5000';

const run = async () => {
  try {
    // pick a hospital to use from existing hospitals endpoint
    const hospResp = await fetch(`${server}/api/hospitals`);
    const hospJson = await hospResp.json().catch(() => ({}));
    const hospitalId = hospJson && Array.isArray(hospJson.data) && hospJson.data.length ? hospJson.data[0].id || hospJson.data[0]._id : null;

    const unique = Date.now();
    const email = `testpatient+${unique}@example.com`;
    const payload = {
      name: `Test Patient ${unique}`,
      email,
      phone: '9000000000',
      password: 'Aa!12345',
      role: 'patient',
      aadhaar_no: '999900001111',
      age: 30,
      blood_type: 'A+',
      hospital: hospitalId
    };

    console.log('Registering test patient with payload:', payload);
    const resp = await fetch(`${server}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await resp.json().catch(() => ({}));
    console.log('Registration response status', resp.status, 'body:', result);

    // Connect to DB and search for patient record by email
    await connectDB();
    const patient = await Patient.findOne({ email }).lean();
    console.log('Found patient doc:', patient ? { _id: patient._id, hospital: patient.hospital, hospitalName: patient.hospitalName } : 'not found');

    // Look for a verification Request created for this user
    if (patient) {
      const req = await Request.findOne({ requestedBy: patient.userId || patient.userId }).sort({ createdAt: -1 }).lean();
      console.log('Recent request for this user (if any):', req ? { _id: req._id, hospitalId: req.hospitalId, patientHospitalName: req.patientHospitalName } : 'none');
    }

    process.exit(0);
  } catch (e) {
    console.error('Test script failed', e);
    process.exit(1);
  }
};

run();
