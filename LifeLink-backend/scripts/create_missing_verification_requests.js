import mongoose from '../src/config/mongodb.js';
import User from '../src/models/User.js';
import Patient from '../src/models/Patient.js';
import Donor from '../src/models/Donor.js';
import Request from '../src/models/Request.js';

(async function(){
  try{
    await mongoose.connect(process.env.MONGODB_URI||'mongodb://localhost:27017/LifeLinkdb');
    const users = await User.find({ role: { $in: ['patient','donor'] }, is_verified: false }).lean();
    console.log('UNVERIFIED USERS', users.length);
    for(const u of users){
      try{
        let roleDoc=null;
        if(u.role==='patient') roleDoc = await Patient.findOne({ userId: u._id }).lean();
        if(u.role==='donor') roleDoc = await Donor.findOne({ userId: u._id }).lean();
        const hospitalId = (roleDoc && (roleDoc.hospital || roleDoc.hospitalId)) ? (roleDoc.hospital || roleDoc.hospitalId) : (u.hospital || u.hospitalId);
        if(!hospitalId){
          console.log('No hospital for user', u.email, u._id);
          continue;
        }
        const exists = await Request.findOne({ requestType:'user_verification', requestedBy: u._id, hospitalId: hospitalId }).lean();
        if(exists){
          console.log('Request already exists for', u.email);
          continue;
        }
        const newReq = new Request({
          requestType: 'user_verification',
          status: 'pending',
          hospitalId: hospitalId,
          requestedBy: u._id,
          patientId: u.role==='patient' ? (roleDoc?._id || u._id) : undefined,
          donorId: u.role==='donor' ? (roleDoc?._id || u._id) : undefined,
          message: `Auto-created verification for ${u.email}`
        });
        await newReq.save();
        console.log('Created request for', u.email, '->', newReq._id);
      }catch(e){
        console.error('ERR', u.email, e.message);
      }
    }
    process.exit(0);
  }catch(e){
    console.error(e);
    process.exit(1);
  }
})();
