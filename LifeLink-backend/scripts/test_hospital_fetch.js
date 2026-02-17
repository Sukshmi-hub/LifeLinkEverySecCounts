import mongoose from '../src/config/mongodb.js';
import Hospital from '../src/models/Hospital.js';
import jwt from 'jsonwebtoken';

(async ()=>{
  try{
    await mongoose.connect(process.env.MONGODB_URI||'mongodb://localhost:27017/LifeLinkdb');
    const hospital = await Hospital.findById('6990b67ad6e4f6590c801496').lean();
    console.log('hospital', hospital);
    const token = jwt.sign({ userId: hospital.userId.toString() }, process.env.JWT_SECRET);
    console.log('token', token);
    const res = await fetch('http://localhost:5000/api/hospital-requests/verify', { headers: { Authorization: `Bearer ${token}` } });
    console.log('status', res.status);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
    process.exit(0);
  }catch(e){
    console.error(e);
    process.exit(1);
  }
})();
