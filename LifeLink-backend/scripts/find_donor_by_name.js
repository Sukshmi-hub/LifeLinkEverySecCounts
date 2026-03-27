import dotenv from 'dotenv'
import { connectDB } from '../src/config/mongodb.js'
import Donor from '../src/models/Donor.js'

dotenv.config()

const run = async () => {
  try {
    await connectDB()
    const name = process.argv[2] || 'Priya Verma'
    const found = await Donor.find({ name: { $regex: name, $options: 'i' } }).lean()
    console.log('Found donors matching', name, ':', found.length)
    for (const d of found) console.log({ id: String(d._id), name: d.name, userId: d.userId, certificates: (d.certificates||[]).length })
    process.exit(0)
  } catch (e) { console.error(e); process.exit(1) }
}
run()
