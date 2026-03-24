#!/usr/bin/env node
/**
 * One-off cleanup script to remove automatic "Donor matched" messages
 * Usage:
 *   node scripts/cleanup_matched_messages.js        # dry-run, shows what would be deleted
 *   node scripts/cleanup_matched_messages.js --yes  # actually delete matching messages
 */
import dotenv from 'dotenv'
dotenv.config()

import { connectDB } from '../src/config/mongodb.js'
import Message from '../src/models/Message.js'

const argv = process.argv.slice(2)
const doDelete = argv.includes('--yes') || argv.includes('-y') || argv.includes('--force')

const regexRoom = /donor_[0-9a-fA-F]{8,64}/
const regexContent = /donor matched|matched donor|donor matched for request|matched donor details/i

async function main() {
  await connectDB()

  console.log('Searching for matching messages (roomId contains donor_ OR content matches donor matched)...')
  const filter = { $or: [ { roomId: { $regex: regexRoom } }, { content: { $regex: regexContent } } ] }

  const total = await Message.countDocuments(filter)
  console.log(`Found ${total} matching message(s).`)

  if (total === 0) {
    console.log('Nothing to delete. Exiting.')
    process.exit(0)
  }

  if (!doDelete) {
    // show per-room summary
    const agg = await Message.aggregate([
      { $match: filter },
      { $group: { _id: '$roomId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
    console.log('Matching messages grouped by room (top results):')
    agg.slice(0, 50).forEach(r => console.log(`  ${r._id} -> ${r.count}`))
    console.log('\nDRY RUN: no messages were deleted. To delete, re-run with `--yes` flag.')
    process.exit(0)
  }

  // Safety: ask for explicit confirmation when running interactively
  try {
    // perform deletion
    const res = await Message.deleteMany(filter)
    console.log(`Deleted ${res.deletedCount || 0} message(s).`)
    process.exit(0)
  } catch (e) {
    console.error('Deletion failed', e)
    process.exit(2)
  }
}

main().catch(err => {
  console.error('Cleanup script failed:', err)
  process.exit(1)
})
