// src/controllers/authController.js
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Donor from '../models/Donor.js';
import Hospital from '../models/Hospital.js';
import NGO from '../models/NGO.js';
import Admin from '../models/Admin.js';
import Message from '../models/Message.js';
import Dots from '../models/Dots.js';
import PendingSignup from '../models/PendingSignup.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../config/email.js';

const OTP_EXPIRY_MINUTES = 5;
const OTP_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

const parseDuplicateKeyError = (err) => {
  try {
    if (err.keyValue && typeof err.keyValue === 'object') {
      const field = Object.keys(err.keyValue)[0];
      return { field, value: err.keyValue[field] };
    }
    const msg = err.message || '';
    const valueMatch = msg.match(/dup key:\s*\{\s*: "([^"]+)"\s*\}/);
    const idxMatch = msg.match(/index:\s*([^\s]+)\s*/);
    const value = valueMatch ? valueMatch[1] : undefined;
    let field;
    if (idxMatch) {
      const idx = idxMatch[1];
      const parts = idx.split('.');
      const last = parts[parts.length - 1];
      field = last.replace(/\$?/, '').replace(/_\d+$/, '');
    }
    return { field: field || 'field', value };
  } catch (e) {
    return { field: 'field', value: undefined };
  }
};

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

const generateOtp = () => `${Math.floor(100000 + Math.random() * 900000)}`;
const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const clearOtpState = (user, key) => {
  user[key] = {
    codeHash: null,
    expiresAt: null,
    attempts: 0,
    resendCount: 0,
    lastSentAt: null,
  };
};

const setOtpState = (user, key, otp) => {
  user[key] = {
    codeHash: hashOtp(otp),
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    attempts: 0,
    resendCount: (user[key]?.resendCount || 0) + 1,
    lastSentAt: new Date(),
  };
};

const validateOtpState = (user, key, otp) => {
  const state = user[key] || {};

  if (!state.codeHash || !state.expiresAt) {
    return { ok: false, status: 400, message: 'OTP not requested or already used.' };
  }

  if (new Date(state.expiresAt).getTime() < Date.now()) {
    clearOtpState(user, key);
    return { ok: false, status: 400, message: 'OTP has expired. Please request a new one.' };
  }

  if ((state.attempts || 0) >= MAX_OTP_ATTEMPTS) {
    clearOtpState(user, key);
    return { ok: false, status: 429, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  if (state.codeHash !== hashOtp(otp)) {
    user[key].attempts = (state.attempts || 0) + 1;
    const remaining = Math.max(MAX_OTP_ATTEMPTS - user[key].attempts, 0);
    return { ok: false, status: 400, message: `Invalid OTP. ${remaining} attempts remaining.` };
  }

  return { ok: true };
};

const ensureResendAllowed = (user, key) => {
  const lastSentAt = user[key]?.lastSentAt;
  if (!lastSentAt) return null;

  const elapsed = Date.now() - new Date(lastSentAt).getTime();
  if (elapsed < RESEND_COOLDOWN_MS) {
    const seconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
    return `Please wait ${seconds} seconds before requesting another OTP.`;
  }

  return null;
};

const sendSignupVerificationOtp = async (user) => {
  const otp = generateOtp();
  setOtpState(user, 'emailVerification', otp);
  await user.save();
  console.log('[auth] Sending email verification OTP:', {
    userId: String(user?._id || ''),
    email: user?.email || '',
  });
  await sendVerificationEmail(user.email, otp);
};

const validatePendingSignupOtp = (record, otp) => {
  if (!record || !record.otpHash || !record.expiresAt) {
    return { ok: false, status: 400, message: 'OTP not requested or already used.' };
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return { ok: false, status: 400, message: 'OTP has expired. Please request a new one.' };
  }

  if ((record.attempts || 0) >= MAX_OTP_ATTEMPTS) {
    return { ok: false, status: 429, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  if (record.otpHash !== hashOtp(otp)) {
    record.attempts = (record.attempts || 0) + 1;
    const remaining = Math.max(MAX_OTP_ATTEMPTS - record.attempts, 0);
    return { ok: false, status: 400, message: `Invalid OTP. ${remaining} attempts remaining.` };
  }

  return { ok: true };
};

const ensurePendingSignupResendAllowed = (record) => {
  const lastSentAt = record?.lastSentAt;
  if (!lastSentAt) return null;

  const elapsed = Date.now() - new Date(lastSentAt).getTime();
  if (elapsed < RESEND_COOLDOWN_MS) {
    const seconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
    return `Please wait ${seconds} seconds before requesting another OTP.`;
  }

  return null;
};

const signupCore = async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      phone,
      role,
      aadhaar_no,
      age,
      blood_type,
      location,
      city,
      state,
      address,
      emergency_contact,
      emergency_contact_name,
      emergency_contact_phone,
      hospital_type,
      hospital_contact_phone,
      hospital_address,
      ngo_contact_phone,
      ngo_registered_office_address,
    } = req.body;

    const normalizedEmail = normalizeEmail(email);
    console.log('Register payload:', { email: normalizedEmail, name, role, phone });

    const pick = (keys) => {
      for (const key of keys) {
        if (req.body[key] !== undefined) return req.body[key];
      }
      return undefined;
    };

    const hospitalContactNormalized = pick([
      'hospital_contact_phone',
      'hospital_contact',
      'hospitalContactPhone',
      'hospital_phone',
      'contact_phone',
      'contactPhone',
    ]);
    const hospitalAddressNormalized = pick([
      'hospital_address',
      'hospital_full_address',
      'hospitalAddress',
      'address',
      'hospital_addr',
    ]);
    const ngoContactNormalized = pick([
      'ngo_contact_phone',
      'ngo_contact',
      'ngoContactPhone',
      'ngoContact',
      'ngo_phone',
    ]);
    const ngoAddressNormalized = pick([
      'ngo_registered_office_address',
      'registered_office_address',
      'ngo_registered_office_address',
      'ngo_address',
      'address',
    ]);
    const latNormalized = pick(['latitude', 'lat', 'location_lat', 'latlng_lat']);
    const lonNormalized = pick(['longitude', 'lon', 'lng', 'location_lon', 'location_lng', 'latlng_lon']);
    const fullAddressNormalized = pick([
      'full_address',
      'fullAddress',
      'address',
      'location_full_address',
      'display_name',
    ]);
    const countryNormalized = pick(['country', 'location_country']);
    const hospitalNormalized = pick([
      'hospital',
      'hospital_id',
      'hospitalId',
      'hospitalIdStr',
      'hospitalIdString',
      'admittedHospital',
      'admitted_hospital',
    ]);
    const locationAutoFlag = pick(['location_auto', 'use_location', 'auto_location', 'useMyLocation']);

    const cleanAadhaar = aadhaar_no && String(aadhaar_no).trim() ? String(aadhaar_no).trim() : undefined;

    const pendingSignup = await PendingSignup.findOne({ email: normalizedEmail });
    if (!pendingSignup || !pendingSignup.verifiedAt) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email with OTP before creating the account.',
      });
    }

    if (role === 'ngo') {
      if (!normalizedEmail || !password || !name) {
        return res.status(400).json({
          success: false,
          message: 'Missing fields: email, password, and name are required for NGO.',
        });
      }
    } else if (!normalizedEmail || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing fields: email, password, name, and role are required.',
      });
    }

    if ((role === 'patient' || role === 'donor') && !cleanAadhaar) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number is required for patients and donors.',
      });
    }

    if (role === 'patient' || role === 'donor') {
      if (age === undefined || age === null) {
        return res.status(400).json({
          success: false,
          message: 'Age is required for patients and donors.',
        });
      }
      if (!blood_type) {
        return res.status(400).json({
          success: false,
          message: 'Blood type is required for patients and donors.',
        });
      }
    }

    let existingUser = null;
    if (role === 'patient' || role === 'donor') {
      existingUser = cleanAadhaar
        ? await User.findOne({ $or: [{ email: normalizedEmail }, { aadhaar_no: cleanAadhaar }] })
        : await User.findOne({ email: normalizedEmail });
    } else {
      existingUser = await User.findOne({ email: normalizedEmail });
    }

    if (existingUser && existingUser.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'This account has been permanently blocked and cannot register again.',
      });
    }

    if (phone) {
      try {
        const blockedByPhone = await User.findOne({ phone });
        if (blockedByPhone && blockedByPhone.status === 'blocked') {
          return res.status(403).json({
            success: false,
            message: 'This account has been permanently blocked and cannot register again.',
          });
        }
      } catch (e) {
        console.warn('Phone lookup during registration failed:', e.message);
      }
    }

    let userToUse = null;
    if (existingUser) {
      if (existingUser.role === role) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists.',
        });
      }

      userToUse = existingUser;
      if (password) userToUse.password = password;
      if (cleanAadhaar) userToUse.aadhaar_no = cleanAadhaar;
      userToUse.name = userToUse.name || name;
      userToUse.phone = userToUse.phone || phone || null;
      userToUse.isEmailVerified = false;
      clearOtpState(userToUse, 'emailVerification');
      await userToUse.save();
    }

    const userData = {
      name,
      email: normalizedEmail,
      password,
      phone: phone || null,
      role,
      is_verified: false,
      isEmailVerified: false,
    };
    if (cleanAadhaar && (role === 'patient' || role === 'donor')) userData.aadhaar_no = cleanAadhaar;

    let newUser = null;
    if (userToUse) {
      newUser = userToUse;
    } else {
      newUser = new User(userData);
      await newUser.save();
    }

    const roleModelMap = {
      patient: Patient,
      donor: Donor,
      hospital: Hospital,
      ngo: NGO,
      admin: Admin,
    };

    const Model = roleModelMap[role];
    if (!Model) {
      await User.findByIdAndDelete(newUser._id).catch(() => {});
      return res.status(500).json({
        success: false,
        message: 'Unknown role for handling',
        error: 'No model found',
      });
    }

    const filter = {};
    if ((role === 'patient' || role === 'donor') && cleanAadhaar) {
      filter.aadhaar_no = cleanAadhaar;
    } else {
      filter.userId = newUser._id;
    }

    const roleData = {
      userId: newUser._id,
      name,
      email: normalizedEmail,
      phone: phone || null,
      password,
    };

    if (role === 'patient') {
      roleData.aadhaar_no = cleanAadhaar;
      roleData.age = age || null;
      roleData.blood_type = blood_type || 'O+';
      roleData.location =
        location ||
        (city || state || latNormalized || lonNormalized || fullAddressNormalized || countryNormalized
          ? {
              city: city || '',
              state: state || '',
              latitude: latNormalized || undefined,
              longitude: lonNormalized || undefined,
              full_address: fullAddressNormalized || '',
              country: countryNormalized || '',
            }
          : {});
      roleData.hospital = hospitalNormalized || req.body.hospital || null;
    }

    if (role === 'donor') {
      roleData.aadhaar_no = cleanAadhaar;
      roleData.age = age || null;
      roleData.blood_type = blood_type || 'O+';
      roleData.donation_type = req.body.donation_type || [];
      roleData.location =
        location ||
        (city || state || latNormalized || lonNormalized || fullAddressNormalized || countryNormalized
          ? {
              city: city || '',
              state: state || '',
              latitude: latNormalized || undefined,
              longitude: lonNormalized || undefined,
              full_address: fullAddressNormalized || '',
              country: countryNormalized || '',
            }
          : {});
      roleData.address = address || '';
      roleData.emergency_contact =
        emergency_contact ||
        (emergency_contact_name || emergency_contact_phone
          ? {
              name: emergency_contact_name || '',
              phone: emergency_contact_phone || '',
            }
          : {});
    }

    if (role === 'hospital') {
      roleData.hospital_type = hospital_type || '';
      roleData.contact_phone = hospitalContactNormalized || hospital_contact_phone || '';
      roleData.address = hospitalAddressNormalized || hospital_address || '';
      roleData.location =
        location ||
        (city || state || latNormalized || lonNormalized || fullAddressNormalized || countryNormalized
          ? {
              city: city || '',
              state: state || '',
              latitude: latNormalized || undefined,
              longitude: lonNormalized || undefined,
              full_address: fullAddressNormalized || '',
              country: countryNormalized || '',
            }
          : {});
    }

    if (role === 'ngo') {
      roleData.ngo_contact_phone = ngoContactNormalized || ngo_contact_phone || '';
      roleData.registered_office_address = ngoAddressNormalized || ngo_registered_office_address || '';
      roleData.location =
        location ||
        (city || state || latNormalized || lonNormalized || fullAddressNormalized || countryNormalized
          ? {
              city: city || '',
              state: state || '',
              latitude: latNormalized || undefined,
              longitude: lonNormalized || undefined,
              full_address: fullAddressNormalized || '',
              country: countryNormalized || '',
            }
          : {});
    }

    if (locationAutoFlag && (locationAutoFlag === true || locationAutoFlag === 'true')) {
      const loc = roleData.location || {};
      if (!loc.latitude || !loc.longitude) {
        return res.status(400).json({
          success: false,
          message: 'Location auto-detection requested but coordinates are missing.',
        });
      }
    }

    try {
      const update = { $set: {}, $setOnInsert: {} };
      update.$set.name = roleData.name;
      update.$set.email = roleData.email;
      update.$set.phone = roleData.phone;
      update.$set.password = roleData.password;
      update.$setOnInsert.userId = newUser._id;

      if (role === 'patient' || role === 'donor' || role === 'hospital' || role === 'ngo') {
        if (cleanAadhaar) update.$setOnInsert.aadhaar_no = cleanAadhaar;
        update.$set.age = roleData.age;
        update.$set.blood_type = roleData.blood_type;

        if (roleData.location && typeof roleData.location === 'object' && Object.keys(roleData.location).length) {
          Object.keys(roleData.location).forEach((lk) => {
            update.$set[`location.${lk}`] = roleData.location[lk];
          });
        }

        const explicitBodyHospitalName = pick([
          'patientHospitalName',
          'patient_hospital_name',
          'hospitalName',
          'hospital_name',
          'hospitalNameDisplay',
          'admittedHospital',
          'admitted_hospital',
          'hospital_name_display',
        ]);

        if (roleData.hospital) {
          update.$set.hospital = roleData.hospital;
          let resolvedName = undefined;
          try {
            const hospCandidate = roleData.hospital;
            const isObjectIdLike =
              typeof hospCandidate === 'string' &&
              hospCandidate.length === 24 &&
              /^[0-9a-fA-F]+$/.test(hospCandidate);
            let hospDoc = null;
            if (isObjectIdLike) hospDoc = await Hospital.findById(hospCandidate).lean();
            if (!hospDoc) {
              hospDoc = await Hospital.findOne({
                $or: [{ name: hospCandidate }, { legacyId: hospCandidate }, { externalId: hospCandidate }],
              }).lean();
            }
            if (hospDoc && hospDoc.name) resolvedName = hospDoc.name;
          } catch (e) {
            console.warn('Failed to resolve hospital name during registration update', e.message);
          }

          if (explicitBodyHospitalName) update.$set.hospitalName = explicitBodyHospitalName;
          else if (resolvedName) update.$set.hospitalName = resolvedName;
          if (update.$set.hospitalName) update.$set.admittedHospital = update.$set.hospitalName;
        } else if (explicitBodyHospitalName) {
          update.$set.hospitalName = explicitBodyHospitalName;
          update.$set.admittedHospital = explicitBodyHospitalName;
        }

        if (role === 'donor') {
          update.$set.address = roleData.address;
          update.$set.emergency_contact = roleData.emergency_contact;
        }
        if (role === 'hospital') {
          update.$set.hospital_type = roleData.hospital_type;
          update.$set.contact_phone = roleData.contact_phone;
          update.$set.address = roleData.address;
        }
        if (role === 'ngo') {
          update.$set.ngo_contact_phone = roleData.ngo_contact_phone;
          update.$set.registered_office_address = roleData.registered_office_address;
        }
      }

      await Model.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      });

      if (role === 'hospital') {
        try {
          const hospDoc = await Hospital.findOne({ userId: newUser._id }).exec();
          if (hospDoc) {
            const Inventory = (await import('../models/Inventory.js')).default;
            const ORGANS_LIST = ['KIDNEY', 'LIVER', 'HEART', 'LUNG', 'PANCREAS', 'CORNEA', 'BONE MARROW'];
            const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

            for (const organ of ORGANS_LIST) {
              await Inventory.findOneAndUpdate(
                { hospitalId: hospDoc._id, itemType: 'organ', organType: { $regex: `^${organ}$`, $options: 'i' } },
                { $setOnInsert: { organType: organ, count: 0, bloodType: '' } },
                { upsert: true, new: true }
              );
            }

            for (const bg of BLOOD_GROUPS) {
              await Inventory.findOneAndUpdate(
                { hospitalId: hospDoc._id, itemType: 'blood', bloodType: { $regex: `^${bg}$`, $options: 'i' } },
                { $setOnInsert: { bloodType: bg, count: 0, organType: '' } },
                { upsert: true, new: true }
              );
            }
          }
        } catch (seedErr) {
          console.error('Inventory seeding failed for hospital:', seedErr);
        }
      }

      if (role === 'patient' || role === 'donor') {
        try {
          let selectedHospitalId = req.body.hospital || req.body.hospital_id || req.body.hospitalId;
          try {
            if (selectedHospitalId) {
              let hospDoc = null;
              const isObjectIdLike =
                typeof selectedHospitalId === 'string' &&
                selectedHospitalId.length === 24 &&
                /^[0-9a-fA-F]+$/.test(selectedHospitalId);
              if (isObjectIdLike) {
                hospDoc = await Hospital.findById(selectedHospitalId).exec();
              }
              if (!hospDoc) {
                hospDoc = await Hospital.findOne({
                  $or: [{ name: selectedHospitalId }, { legacyId: selectedHospitalId }, { externalId: selectedHospitalId }],
                }).exec();
              }
              if (hospDoc && hospDoc._id) selectedHospitalId = String(hospDoc._id);
            }
          } catch (e) {
            console.warn('Failed to normalize selectedHospitalId during registration', e.message);
          }

          if (selectedHospitalId) {
            const Request = (await import('../models/Request.js')).default;
            let roleDoc = null;
            try {
              roleDoc = await Model.findOne({ userId: newUser._id }).exec();
            } catch (e) {
              console.warn('Failed to fetch role document after registration:', e.message);
            }

            let hospDocForRequest = null;
            try {
              const isObjectIdLike =
                typeof selectedHospitalId === 'string' &&
                selectedHospitalId.length === 24 &&
                /^[0-9a-fA-F]+$/.test(selectedHospitalId);
              if (isObjectIdLike) hospDocForRequest = await Hospital.findById(selectedHospitalId).lean();
              if (!hospDocForRequest) {
                hospDocForRequest = await Hospital.findOne({
                  $or: [{ name: selectedHospitalId }, { legacyId: selectedHospitalId }, { externalId: selectedHospitalId }],
                }).lean();
              }
            } catch (e) {
              console.warn('Failed to resolve hospital for verification request:', e.message);
            }

            const verificationRequest = new Request({
              requestType: 'user_verification',
              status: 'pending',
              hospitalId: selectedHospitalId,
              patientHospitalName: hospDocForRequest && hospDocForRequest.name ? hospDocForRequest.name : undefined,
              requestedBy: newUser._id,
              patientId: role === 'patient' ? roleDoc?._id || newUser._id : undefined,
              donorId: role === 'donor' ? roleDoc?._id || newUser._id : undefined,
              message: `New ${role} registration - pending verification`,
            });
            await verificationRequest.save();

            try {
              const pid = roleDoc?._id || newUser._id;
              const roomId = `room_hospital_${selectedHospitalId}_patient_${pid}`;
              let hospitalAccountUserId = null;
              try {
                const hospDoc = await Hospital.findById(selectedHospitalId).exec();
                if (hospDoc && hospDoc.userId) hospitalAccountUserId = hospDoc.userId;
              } catch (e) {
                console.warn('Failed to fetch hospital account user for room:', e.message);
              }
              const senderId = hospitalAccountUserId || newUser._id;
              const senderRole = hospitalAccountUserId ? 'hospital' : 'system';

              const welcomeMsg = new Message({
                senderId,
                senderRole,
                roomId,
                content: 'Verification request created and sent to hospital.',
                timestamp: new Date(),
              });
              await welcomeMsg.save();

              if (hospitalAccountUserId) {
                const tgt = String(hospitalAccountUserId);
                await Dots.findOneAndUpdate(
                  { userId: tgt },
                  { $set: { 'dots.messages': true }, $setOnInsert: { userType: 'hospital' } },
                  { upsert: true }
                );
                try {
                  const map = global.__LIFELINK_USER_SOCKET_MAP;
                  const ioRef = global.__LIFELINK_IO;
                  if (map && ioRef && map.has(tgt)) ioRef.to(map.get(tgt)).emit('dots_updated', { section: 'messages' });
                } catch (e) {
                  console.warn('Failed to emit dots update:', e.message);
                }
              }
            } catch (e) {
              console.error('Failed to create initial chat message for verification request', e);
            }
          }
        } catch (reqError) {
          console.error('Failed to create verification request:', reqError.message);
        }
      }
    } catch (err) {
      console.error('Role upsert failed:', err);
      await User.findByIdAndDelete(newUser._id).catch(() => {});
      if (err && err.code === 11000) {
        const parsed = parseDuplicateKeyError(err);
        return res.status(400).json({
          success: false,
          message: `Duplicate field: ${parsed.field}`,
          field: parsed.field,
          value: parsed.value,
          error: err.message,
        });
      }
      if (err.name === 'ValidationError') {
        const details = Object.keys(err.errors || {}).map((k) => err.errors[k].message);
        return res.status(400).json({
          success: false,
          message: details.length ? `Validation error: ${details.join('; ')}` : 'Validation error',
          errors: details,
          error: err.message,
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to create or attach role document',
        error: err.message,
      });
    }

    newUser.isEmailVerified = true;
    clearOtpState(newUser, 'emailVerification');
    await newUser.save();
    await PendingSignup.deleteOne({ email: normalizedEmail });

    return res.status(201).json({
      success: true,
      message: 'Signup successful. Your email was already verified.',
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          isEmailVerified: true,
        },
      },
    });
  } catch (error) {
    console.error('Registration Error:', error);
    if (error.code === 11000) {
      const parsed = parseDuplicateKeyError(error);
      return res.status(400).json({
        success: false,
        message: `Duplicate field: ${parsed.field}`,
        field: parsed.field,
        value: parsed.value,
        error: error.message,
      });
    }
    if (error.name === 'ValidationError') {
      const details = Object.keys(error.errors || {}).map((k) => error.errors[k].message);
      return res.status(400).json({
        success: false,
        message: details.length ? `Validation error: ${details.join('; ')}` : 'Validation error',
        errors: details,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

export const signup = signupCore;
export const register = signupCore;

export const sendSignupOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    console.log('[auth] Incoming email for sendSignupOtp:', normalizedEmail);

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    let pendingSignup = await PendingSignup.findOne({ email: normalizedEmail });
    if (!pendingSignup) {
      pendingSignup = new PendingSignup({ email: normalizedEmail });
    }

    const cooldownMessage = ensurePendingSignupResendAllowed(pendingSignup);
    if (cooldownMessage) {
      return res.status(429).json({ success: false, message: cooldownMessage });
    }

    const otp = generateOtp();
    pendingSignup.otpHash = hashOtp(otp);
    pendingSignup.expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    pendingSignup.attempts = 0;
    pendingSignup.resendCount = (pendingSignup.resendCount || 0) + 1;
    pendingSignup.lastSentAt = new Date();
    pendingSignup.verifiedAt = null;
    await pendingSignup.save();

    console.log('[auth] sendSignupOtp triggered verification email:', { email: normalizedEmail });
    console.log('[auth] signup triggered verification email:', { email: normalizedEmail });
    await sendVerificationEmail(normalizedEmail, otp);

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email address.',
    });
  } catch (error) {
    console.error('Send Signup OTP Error:', error?.message, error?.stack, error);
    return res.status(500).json({ success: false, message: 'Failed to send signup OTP.' });
  }
};

export const verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const pendingSignup = await PendingSignup.findOne({ email: normalizedEmail });
    if (!pendingSignup) {
      return res.status(404).json({ success: false, message: 'No signup OTP request found for this email.' });
    }

    const validation = validatePendingSignupOtp(pendingSignup, otp);
    if (!validation.ok) {
      await pendingSignup.save();
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    pendingSignup.verifiedAt = new Date();
    pendingSignup.attempts = 0;
    await pendingSignup.save();

    return res.status(200).json({
      success: true,
      message: 'Email OTP verified. You can now complete registration.',
    });
  } catch (error) {
    console.error('Verify Signup OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify signup OTP.' });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({ success: true, message: 'Email is already verified.' });
    }

    const validation = validateOtpState(user, 'emailVerification', otp);
    if (!validation.ok) {
      await user.save();
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    user.isEmailVerified = true;
    user.verification_token = null;
    clearOtpState(user, 'emailVerification');
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now login.',
    });
  } catch (error) {
    console.error('Verify Email Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify email.' });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }

    const cooldownMessage = ensureResendAllowed(user, 'emailVerification');
    if (cooldownMessage) {
      return res.status(429).json({ success: false, message: cooldownMessage });
    }

    console.log('[auth] resendVerification triggered email verification:', {
      userId: String(user?._id || ''),
      email: user?.email || '',
    });
    await sendSignupVerificationOtp(user);

    return res.status(200).json({
      success: true,
      message: 'A new verification OTP has been sent to your email.',
    });
  } catch (error) {
    console.error('Resend Verification Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resend verification OTP.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    if (!role) {
      return res.status(400).json({ success: false, message: 'Role selection is required' });
    }

    const user = await User.findOne({ email: normalizeEmail(email) }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been permanently blocked. Please contact support.',
      });
    }

    if (user.status === 'suspended') {
      if (user.suspendedUntil && user.suspendedUntil > Date.now()) {
        const hoursLeft = Math.ceil((user.suspendedUntil - Date.now()) / (1000 * 60 * 60));
        return res.status(403).json({
          success: false,
          message: `Your account is suspended for ${hoursLeft} more hours.`,
        });
      }
      user.status = 'active';
      user.suspendedUntil = null;
      await user.save();
    }

    if (user.role.toLowerCase() !== String(role).toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Invalid role selected for this user.',
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
        verification_status: 'email_pending',
      });
    }

    if (user.role === 'patient' && !user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending hospital verification. Please wait for hospital approval before logging in.',
        verification_status: 'pending',
        role: user.role,
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          email: user.email,
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          phone: req.user.phone,
          is_verified: req.user.is_verified,
          isEmailVerified: req.user.isEmailVerified,
        },
      },
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    return res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout Error:', error);
    return res.status(500).json({ success: false, message: 'Logout failed', error: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    console.log('[auth] Incoming email for forgotPassword:', normalizeEmail(email));

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(200).json({ success: true, message: 'If that email exists, a reset OTP has been sent.' });
    }

    const cooldownMessage = ensureResendAllowed(user, 'passwordReset');
    if (cooldownMessage) {
      return res.status(429).json({ success: false, message: cooldownMessage });
    }

    const otp = generateOtp();
    setOtpState(user, 'passwordReset', otp);
    await user.save();
    console.log('[auth] forgotPassword triggered password reset email:', {
      userId: String(user._id || ''),
      email: user.email || '',
    });
    await sendPasswordResetEmail(user.email, otp);

    return res.status(200).json({ success: true, message: 'If that email exists, a reset OTP has been sent.' });
  } catch (error) {
    console.error('Forgot Password Error:', error?.message, error?.stack, error);
    return res.status(500).json({ success: false, message: 'Error processing forgot password request' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, password, confirmPassword, token } = req.body;

    if (token) {
      const legacyPassword = password || newPassword;
      if (!legacyPassword || !confirmPassword) {
        return res.status(400).json({ success: false, message: 'Token and password fields are required' });
      }
      if (legacyPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
      }
      if (legacyPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
      }

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const user = await User.findOne({
        resetToken: hashedToken,
        resetTokenExpiry: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      }

      user.password = legacyPassword;
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      clearOtpState(user, 'passwordReset');
      await user.save();
      return res.status(200).json({ success: true, message: 'Password reset successful. You can now login.' });
    }

    if (!email || !otp || !(newPassword || password)) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and newPassword are required.' });
    }

    const nextPassword = newPassword || password;
    const confirm = confirmPassword || nextPassword;
    if (nextPassword !== confirm) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }
    if (nextPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const user = await User.findOne({ email: normalizeEmail(email) }).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const validation = validateOtpState(user, 'passwordReset', otp);
    if (!validation.ok) {
      await user.save();
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    user.password = nextPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    clearOtpState(user, 'passwordReset');
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successful. You can now login.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ success: false, message: 'Error resetting password' });
  }
};

export default {
  sendSignupOtp,
  verifySignupOtp,
  signup,
  register,
  verifyEmail,
  resendVerification,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
};
