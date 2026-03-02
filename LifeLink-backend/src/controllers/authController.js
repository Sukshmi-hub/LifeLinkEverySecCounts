// src/controllers/authController.js
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Donor from '../models/Donor.js';
import Hospital from '../models/Hospital.js';
import NGO from '../models/NGO.js';
import Admin from '../models/Admin.js';
import Message from '../models/Message.js'
import jwt from 'jsonwebtoken';

// Helper to parse MongoDB duplicate key errors into { field, value }
const parseDuplicateKeyError = (err) => {
  try {
    if (err.keyValue && typeof err.keyValue === 'object') {
      const field = Object.keys(err.keyValue)[0];
      return { field, value: err.keyValue[field] };
    }
    // Fallback: attempt to parse from error.message
    // Examples of message formats vary; try to extract "dup key: { : \"value\" }" and index name
    const msg = err.message || '';
    // Try to extract value between quotes after dup key
    const valueMatch = msg.match(/dup key:\s*\{\s*: "([^"]+)"\s*\}/);
    const idxMatch = msg.match(/index:\s*([^\s]+)\s*/);
    const value = valueMatch ? valueMatch[1] : undefined;
    let field;
    if (idxMatch) {
      // index may be like db.collection.$field_1
      const idx = idxMatch[1];
      const parts = idx.split('\.');
      const last = parts[parts.length - 1];
      field = last.replace(/\$?/, '').replace(/_\d+$/, '');
    }
    return { field: field || 'field', value };
  } catch (e) {
    return { field: 'field', value: undefined };
  }
};

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

export const register = async (req, res) => {
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
      emergency_contact_phone
    ,
      // hospital fields
      hospital_type,
      hospital_contact_phone,
      hospital_address,
      // ngo fields
      ngo_contact_phone,
      ngo_registered_office_address
    } = req.body;
    console.log('Register payload:', { email, name, role, phone });

    // Helper to pick the first present key from req.body for flexible frontend names
    const pick = (keys) => {
      for (const k of keys) {
        if (req.body[k] !== undefined) return req.body[k];
      }
      return undefined;
    };

    // Normalize possible frontend field names for hospital and NGO
    const hospitalContactNormalized = pick(['hospital_contact_phone', 'hospital_contact', 'hospitalContactPhone', 'hospital_phone', 'contact_phone', 'contactPhone']);
    const hospitalAddressNormalized = pick(['hospital_address', 'hospital_full_address', 'hospitalAddress', 'address', 'hospital_addr']);
    const ngoContactNormalized = pick(['ngo_contact_phone', 'ngo_contact', 'ngoContactPhone', 'ngoContact', 'ngo_phone']);
    const ngoAddressNormalized = pick(['ngo_registered_office_address', 'registered_office_address', 'ngo_registered_office_address', 'ngo_address', 'address']);
    // Normalize possible frontend field names for coordinates and full address
    const latNormalized = pick(['latitude', 'lat', 'location_lat', 'latlng_lat']);
    const lonNormalized = pick(['longitude', 'lon', 'lng', 'location_lon', 'location_lng', 'latlng_lon']);
    const fullAddressNormalized = pick(['full_address', 'fullAddress', 'address', 'location_full_address', 'display_name']);
    const countryNormalized = pick(['country', 'location_country']);
    const hospitalNormalized = pick(['hospital', 'hospital_id', 'hospitalId', 'hospitalIdStr', 'hospitalIdString']);
    const locationAutoFlag = pick(['location_auto', 'use_location', 'auto_location', 'useMyLocation']);

    // Normalize aadhaar: trim and treat empty string as not provided
    const cleanAadhaar = aadhaar_no && String(aadhaar_no).trim() ? String(aadhaar_no).trim() : undefined;

    // 1. Strict Validation: require aadhaar_no only for patient/donor
    // Remove aadhaar_no validation for NGO role
    if (role === 'ngo') {
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          message: 'Missing fields: email, password, and name are required for NGO.',
        });
      }
    } else {
      // Existing validation for other roles
      if (!email || !password || !name || !role) {
        return res.status(400).json({
          success: false,
          message: 'Missing fields: email, password, name, and role are required.',
        });
      }
    }
    if ((role === 'patient' || role === 'donor') && !cleanAadhaar) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number is required for patients and donors.',
      });
    }

    // Role-specific required fields
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

    // 2. Check if user already exists (only check aadhaar if provided for patient/donor)
    let existingUser = null;
    if (role === 'patient' || role === 'donor') {
      if (cleanAadhaar) {
        existingUser = await User.findOne({ $or: [{ email }, { aadhaar_no: cleanAadhaar }] });
      } else {
        existingUser = await User.findOne({ email });
      }
    } else {
      existingUser = await User.findOne({ email });
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
      if (password) {
        userToUse.password = password;
      }
      if (cleanAadhaar) {
        userToUse.aadhaar_no = cleanAadhaar;
      }
      userToUse.name = userToUse.name || name;
      userToUse.phone = userToUse.phone || phone || null;
      await userToUse.save();
    }

    const userData = {
      name,
      email,
      password,
      phone: phone || null,
      role,
      is_verified: false,
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
      name: name,
      email: email,
      phone: phone || null,
      password: password,
    };
    if (role === 'patient') {
      roleData.aadhaar_no = cleanAadhaar;
      roleData.age = age || null;
      roleData.blood_type = blood_type || 'O+';
      // Accept either a nested `location` object or separate `city`/`state`/coords/full_address fields from the frontend
      roleData.location = location || (city || state || latNormalized || lonNormalized || fullAddressNormalized || countryNormalized ? {
        city: city || '',
        state: state || '',
        latitude: latNormalized || undefined,
        longitude: lonNormalized || undefined,
        full_address: fullAddressNormalized || '',
        country: countryNormalized || ''
      } : {});
      // Accept hospital selection (id or string) from frontend
      roleData.hospital = hospitalNormalized || req.body.hospital || null;
    }
    if (role === 'donor') {
      roleData.aadhaar_no = cleanAadhaar;
      roleData.age = age || null;
      roleData.blood_type = blood_type || 'O+';
      roleData.donation_type = req.body.donation_type || [];
      roleData.location = location || (city || state || latNormalized || lonNormalized || fullAddressNormalized || countryNormalized ? {
        city: city || '',
        state: state || '',
        latitude: latNormalized || undefined,
        longitude: lonNormalized || undefined,
        full_address: fullAddressNormalized || '',
        country: countryNormalized || ''
      } : {});
      // Accept either an `emergency_contact` object or separate name/phone fields
      roleData.address = address || '';
      roleData.emergency_contact = emergency_contact || (emergency_contact_name || emergency_contact_phone ? { name: emergency_contact_name || '', phone: emergency_contact_phone || '' } : {});
    }
    if (role === 'hospital') {
      // hospital-specific fields
      roleData.hospital_type = hospital_type || '';
      roleData.contact_phone = hospitalContactNormalized || hospital_contact_phone || '';
      roleData.address = hospitalAddressNormalized || hospital_address || '';
      // Accept location fields for hospital as well
      roleData.location = location || (city || state || latNormalized || lonNormalized || fullAddressNormalized || countryNormalized ? {
        city: city || '',
        state: state || '',
        latitude: latNormalized || undefined,
        longitude: lonNormalized || undefined,
        full_address: fullAddressNormalized || '',
        country: countryNormalized || ''
      } : {});
    }
    if (role === 'ngo') {
      // NGO-specific fields
      roleData.ngo_contact_phone = ngoContactNormalized || ngo_contact_phone || '';
      roleData.registered_office_address = ngoAddressNormalized || ngo_registered_office_address || '';
      // Accept location fields for NGO as well
      roleData.location = location || (city || state || latNormalized || lonNormalized || fullAddressNormalized || countryNormalized ? {
        city: city || '',
        state: state || '',
        latitude: latNormalized || undefined,
        longitude: lonNormalized || undefined,
        full_address: fullAddressNormalized || '',
        country: countryNormalized || ''
      } : {});
    }

    // If frontend explicitly indicated auto-location should be used, validate coords are present
    if (locationAutoFlag && (locationAutoFlag === true || locationAutoFlag === 'true')) {
      const loc = roleData.location || {};
      if (!loc.latitude || !loc.longitude) {
        return res.status(400).json({ success: false, message: 'Location auto-detection requested but coordinates are missing.' });
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
          // Optional patient/donor/hospital/ngo fields
          update.$set.age = roleData.age;
          update.$set.blood_type = roleData.blood_type;
          // Set nested location fields individually to avoid overwriting with empty object
          if (roleData.location && typeof roleData.location === 'object' && Object.keys(roleData.location).length) {
            Object.keys(roleData.location).forEach((lk) => {
              update.$set[`location.${lk}`] = roleData.location[lk];
            });
          }
          // Set hospital reference if provided and denormalize hospital name if resolvable
          if (roleData.hospital) {
            update.$set.hospital = roleData.hospital;
            try {
              // attempt to resolve hospital name when frontend provided an id or name
              const hospCandidate = roleData.hospital;
              let hospDoc = null;
              const isObjectIdLike = typeof hospCandidate === 'string' && hospCandidate.length === 24 && /^[0-9a-fA-F]+$/.test(hospCandidate);
              if (isObjectIdLike) hospDoc = await Hospital.findById(hospCandidate).lean();
              if (!hospDoc) hospDoc = await Hospital.findOne({ $or: [{ name: hospCandidate }, { legacyId: hospCandidate }, { externalId: hospCandidate }] }).lean();
              if (hospDoc && hospDoc.name) update.$set.hospitalName = hospDoc.name;
            } catch (e) {
              console.warn('Failed to resolve hospital name during registration update', e && e.message ? e.message : e);
            }
          }
        // Donor additional fields
        if (role === 'donor') {
          update.$set.address = roleData.address;
          update.$set.emergency_contact = roleData.emergency_contact;
        }
        // Hospital additional fields
        if (role === 'hospital') {
          update.$set.hospital_type = roleData.hospital_type;
          update.$set.contact_phone = roleData.contact_phone;
          update.$set.address = roleData.address;
        }
        // NGO additional fields
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

      // If registering a hospital, ensure it has inventory rows created with default 0 counts
      if (role === 'hospital') {
        try {
          const hospDoc = await Hospital.findOne({ userId: newUser._id }).exec();
          if (hospDoc) {
            const Inventory = (await import('../models/Inventory.js')).default;
            const ORGANS_LIST = ['KIDNEY','LIVER','HEART','LUNG','PANCREAS','CORNEA','BONE MARROW'];
            const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

            // Upsert organ entries with count 0 if missing. Use case-insensitive match
            // to avoid creating duplicates like 'Kidney' and 'KIDNEY'.
            for (const organ of ORGANS_LIST) {
              try {
                await Inventory.findOneAndUpdate(
                  { hospitalId: hospDoc._id, itemType: 'organ', organType: { $regex: `^${organ}$`, $options: 'i' } },
                  { $setOnInsert: { organType: organ, count: 0, bloodType: '' } },
                  { upsert: true, new: true }
                );
              } catch (e) {
                console.error('Failed to upsert organ inventory for', organ, e);
              }
            }

            // Upsert blood group entries with count 0 if missing
            for (const bg of BLOOD_GROUPS) {
              try {
                await Inventory.findOneAndUpdate(
                  { hospitalId: hospDoc._id, itemType: 'blood', bloodType: { $regex: `^${bg}$`, $options: 'i' } },
                  { $setOnInsert: { bloodType: bg, count: 0, organType: '' } },
                  { upsert: true, new: true }
                );
              } catch (e) {
                console.error('Failed to upsert blood inventory for', bg, e);
              }
            }
          }
        } catch (seedErr) {
          console.error('Inventory seeding failed for hospital:', seedErr);
        }
      }
    
      // If registering a patient or donor and a hospital was selected, create a verification request
      if (role === 'patient' || role === 'donor') {
        try {
          let selectedHospitalId = req.body.hospital || req.body.hospital_id || req.body.hospitalId;
          // Normalize hospital id: if frontend sent a non-ObjectId (e.g., a custom id or name), try to resolve
          try {
            if (selectedHospitalId) {
              // If it's already a 24-char hex string, try to load that hospital
              let hospDoc = null;
              const isObjectIdLike = typeof selectedHospitalId === 'string' && selectedHospitalId.length === 24 && /^[0-9a-fA-F]+$/.test(selectedHospitalId);
              if (isObjectIdLike) {
                hospDoc = await Hospital.findById(selectedHospitalId).exec();
              }
              // If not found yet, try matching by name or by a string id stored in `legacyId` or similar
              if (!hospDoc) {
                hospDoc = await Hospital.findOne({ $or: [ { name: selectedHospitalId }, { legacyId: selectedHospitalId }, { externalId: selectedHospitalId } ] }).exec();
              }
              if (hospDoc && hospDoc._id) selectedHospitalId = String(hospDoc._id);
            }
          } catch (e) {
            console.warn('Failed to normalize selectedHospitalId during registration', e && e.message ? e.message : e);
          }
          if (selectedHospitalId) {
            const Request = (await import('../models/Request.js')).default;

            // Attempt to find the role document (Patient/Donor) created/updated above so we can reference its _id
            let roleDoc = null;
            try {
              roleDoc = await Model.findOne({ userId: newUser._id }).exec();
            } catch (e) {
              // ignore
            }

            // Try to resolve hospital name for denormalized display on the verification request
            let hospDocForRequest = null;
            try {
              const isObjectIdLike = typeof selectedHospitalId === 'string' && selectedHospitalId.length === 24 && /^[0-9a-fA-F]+$/.test(selectedHospitalId);
              if (isObjectIdLike) hospDocForRequest = await Hospital.findById(selectedHospitalId).lean();
              if (!hospDocForRequest) hospDocForRequest = await Hospital.findOne({ $or: [{ name: selectedHospitalId }, { legacyId: selectedHospitalId }, { externalId: selectedHospitalId }] }).lean();
            } catch (e) {
              // ignore resolution errors
            }

            const verificationRequest = new Request({
              requestType: 'user_verification',
              status: 'pending',
              hospitalId: selectedHospitalId,
              patientHospitalName: hospDocForRequest && hospDocForRequest.name ? hospDocForRequest.name : undefined,
              requestedBy: newUser._id,
              // Prefer role document id (Patient/Donor) when available, otherwise fall back to user id
              patientId: role === 'patient' ? (roleDoc?._id || newUser._id) : undefined,
              donorId: role === 'donor' ? (roleDoc?._id || newUser._id) : undefined,
              message: `New ${role} registration - pending verification`
            });
            await verificationRequest.save();
            console.log('Verification request created for hospital', verificationRequest._id);
            // Create an initial chat message so room appears for the patient-hospital conversation
            try {
              const pid = role === 'patient' ? (roleDoc?._id || newUser._id) : (roleDoc?._id || newUser._id)
              const roomId = `room_hospital_${selectedHospitalId}_patient_${pid}`
              // Attempt to use hospital account as sender if available
              let hospitalAccountUserId = null
              try {
                const hospDoc = await Hospital.findById(selectedHospitalId).exec()
                if (hospDoc && hospDoc.userId) hospitalAccountUserId = hospDoc.userId
              } catch (e) {
                // ignore
              }
              const senderId = hospitalAccountUserId || newUser._id
              const senderRole = hospitalAccountUserId ? 'hospital' : 'system'

              const welcomeMsg = new Message({ senderId, senderRole, roomId, content: `Verification request created and sent to hospital.`, timestamp: new Date() })
              await welcomeMsg.save()
            } catch (e) {
              console.error('Failed to create initial chat message for verification request', e)
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
        const msg = details.length ? `Validation error: ${details.join('; ')}` : 'Validation error';
        return res.status(400).json({
          success: false,
          message: msg,
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

    const token = generateToken(newUser._id);

    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
        token,
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
      const msg = details.length ? `Validation error: ${details.join('; ')}` : 'Validation error';
      return res.status(400).json({
        success: false,
        message: msg,
        errors: details,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // 2. Find user in the database (include password field)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 3. Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Block login for unverified patients until hospital verification
    if (user.role === 'patient' && !user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending hospital verification. Please wait for hospital approval before logging in.',
        verification_status: 'pending',
        role: user.role
      });
    }

    // 4. Generate Token and send success
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          email: user.email,
          phone: user.phone
        },
        token
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          phone: req.user.phone,
          is_verified: req.user.is_verified
        }
      }
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

export default { register, login, getMe, logout };