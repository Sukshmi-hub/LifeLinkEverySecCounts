#!/usr/bin/env node
/**
 * Targeted cleanup: remove messages that either
 *  - contain hex ids starting with "69c" (e.g. "69c2530...") often seen in hospital message previews
 *  - OR contain automated "Matched donor" notification text
 *
 * Usage:
 *   node scripts/delete_69c_and_matched.js           # dry-run: lists rooms and counts
 *   node scripts/delete_69c_and_matched.js --yes     # delete listed messages
 */
import dotenv from 'dotenv'
dotenv.config()

import { connectDB } from '../src/config/mongodb.js'
import Message from '../src/models/Message.js'

const argv = process.argv.slice(2)
const doDelete = argv.includes('--yes') || argv.includes('-y')

// Match content that has hex ids starting with 69c (e.g. 69c253045e7ab...)
const regex69c = /69c[0-9a-fA-F]{5,}/

// Match automated matched-donor notification phrases (case-insensitive)
const regexMatched = /matched donor|donor matched|matched donor details|donor matched for request/i

// Also match roomIds that look like donor room under hospital namespace
const regexRoom = /^room_hospital_.*_donor_.*$/i

async function main() {
  await connectDB()

  console.log('Searching for messages containing "69c..." or matched-donor notifications...')

  const filter = {
    $or: [
      { content: { $regex: regex69c } },
      { content: { $regex: regexMatched } },
      { roomId: { $regex: regexRoom } }
    ]
  }

  const total = await Message.countDocuments(filter)
  console.log(`Found ${total} matching message(s).`)

  if (total === 0) {
    console.log('Nothing to delete. Exiting.')
    process.exit(0)
  }

  // Show grouped summary for dry run
  const agg = await Message.aggregate([
    { $match: filter },
    { $group: { _id: '$roomId', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ])

  console.log('Matching messages grouped by room (top 100):')
  agg.slice(0, 100).forEach(r => console.log(`  ${r._id} -> ${r.count}`))

  if (!doDelete) {
    console.log('\nDRY RUN: no messages were deleted. To delete, re-run with `--yes` flag.')
    process.exit(0)
  }

  try {
    const res = await Message.deleteMany(filter)
    console.log(`Deleted ${res.deletedCount || 0} message(s).`)
    process.exit(0)
  } catch (e) {
    console.error('Deletion failed', e)
    process.exit(2)
  }
}

main().catch(err => {
  console.error('Script failed:', err)
  process.exit(1)
})
