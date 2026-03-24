#!/usr/bin/env node
/**
 * Delete messages containing donor ids that start with a given prefix (e.g. "69").
 * Usage:
 *   node scripts/delete_donor_prefix.js --prefix 69     # dry-run
 *   node scripts/delete_donor_prefix.js --prefix 69 --yes  # delete
 */
import dotenv from 'dotenv'
dotenv.config()

import { connectDB } from '../src/config/mongodb.js'
import Message from '../src/models/Message.js'

const argv = process.argv.slice(2)
const doDelete = argv.includes('--yes') || argv.includes('-y')
const pIndex = argv.findIndex(a => a === '--prefix' || a === '-p')
const prefix = pIndex !== -1 && argv[pIndex + 1] ? argv[pIndex + 1] : null

if (!prefix) {
  console.log('Missing --prefix argument. Example: --prefix 69')
  process.exit(2)
}

async function main() {
  await connectDB()

  // Match hex-like ids starting with the prefix e.g. 69[0-9a-f...]
  const regexId = new RegExp(`\\b${prefix}[0-9a-fA-F]{3,}\\b`, 'i')

  // Also match content starting with "Donor <prefix>..."
  const regexDonorStart = new RegExp(`^\\s*Donor\\s+${prefix}[0-9a-fA-F]{0,}`, 'i')

  // room pattern for donor rooms
  const donorRoomRegex = new RegExp(`^room_hospital_.*_donor_.*${prefix}.*$`, 'i')

  const filter = {
    $or: [
      { content: { $regex: regexId } },
      { content: { $regex: regexDonorStart } },
      { roomId: { $regex: donorRoomRegex } }
    ]
  }

  const total = await Message.countDocuments(filter)
  console.log(`Found ${total} matching message(s) for prefix "${prefix}".`)

  if (total === 0) return process.exit(0)

  const agg = await Message.aggregate([
    { $match: filter },
    { $group: { _id: '$roomId', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ])

  console.log('Top matching rooms:')
  agg.slice(0, 50).forEach(r => console.log(`  ${r._id} -> ${r.count}`))

  if (!doDelete) {
    console.log('\nDRY RUN: no messages were deleted. Re-run with --yes to delete.')
    return process.exit(0)
  }

  try {
    const res = await Message.deleteMany(filter)
    console.log(`Deleted ${res.deletedCount || 0} message(s).`)
    process.exit(0)
  } catch (e) {
    console.error('Deletion failed:', e)
    process.exit(2)
  }
}

main().catch(err => { console.error('Error:', err); process.exit(1) })
