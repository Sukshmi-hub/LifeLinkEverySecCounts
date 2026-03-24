#!/usr/bin/env node
/**
 * Delete messages for donor rooms under hospital conversations.
 * Usage:
 *   node scripts/delete_donor_rooms.js           # dry-run: lists rooms and counts
 *   node scripts/delete_donor_rooms.js --yes     # delete listed messages
 *   node scripts/delete_donor_rooms.js --donor 69b046e95ff9...  # filter to specific donor id substring
 */
import dotenv from 'dotenv'
dotenv.config()

import { connectDB } from '../src/config/mongodb.js'
import Message from '../src/models/Message.js'

const argv = process.argv.slice(2)
const doDelete = argv.includes('--yes') || argv.includes('-y')
const donorArgIndex = argv.findIndex(a => a === '--donor' || a === '-d')
const donorFilter = donorArgIndex !== -1 && argv[donorArgIndex + 1] ? argv[donorArgIndex + 1] : null

async function main() {
  await connectDB()

  // Match rooms like: room_hospital_<id>_donor_<id> (donor rooms in hospital namespace)
  const donorRoomRegex = donorFilter
    ? new RegExp(`^room_hospital_.*_donor_.*${donorFilter}.*$`, 'i')
    : /^room_hospital_.*_donor_.*$/i

  console.log('Searching for donor rooms matching:', donorRoomRegex)
  const rooms = await Message.distinct('roomId', { roomId: { $regex: donorRoomRegex } })
  if (!rooms || rooms.length === 0) {
    console.log('No donor rooms found.')
    process.exit(0)
  }

  // Build per-room counts
  const counts = await Message.aggregate([
    { $match: { roomId: { $in: rooms } } },
    { $group: { _id: '$roomId', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ])

  console.log(`Found ${rooms.length} donor room(s). Total message counts per room:`)
  counts.forEach(c => console.log(`  ${c._id} -> ${c.count}`))

  const totalMessages = counts.reduce((s, c) => s + (c.count || 0), 0)
  console.log(`Total messages that would be deleted: ${totalMessages}`)

  if (!doDelete) {
    console.log('\nDry run: no messages were deleted. Re-run with --yes to delete.')
    process.exit(0)
  }

  try {
    const res = await Message.deleteMany({ roomId: { $in: rooms } })
    console.log(`Deleted ${res.deletedCount || 0} messages across ${rooms.length} room(s).`)
    process.exit(0)
  } catch (e) {
    console.error('Deletion failed:', e)
    process.exit(2)
  }
}

main().catch(err => { console.error('Error:', err); process.exit(1) })
