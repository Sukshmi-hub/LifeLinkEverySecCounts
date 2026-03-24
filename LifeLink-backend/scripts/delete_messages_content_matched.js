#!/usr/bin/env node
/**
 * Delete messages whose content matches donor-matched notification phrases.
 * Usage:
 *   node scripts/delete_messages_content_matched.js       # dry-run
 *   node scripts/delete_messages_content_matched.js --yes # delete
 */
import dotenv from 'dotenv'
dotenv.config()

import { connectDB } from '../src/config/mongodb.js'
import Message from '../src/models/Message.js'

const argv = process.argv.slice(2)
const doDelete = argv.includes('--yes') || argv.includes('-y')

const regexMatched = /matched donor|donor matched|matched donor details|donor matched for request/i

async function main() {
  await connectDB()

  console.log('Searching for messages where content matches donor-matched phrases...')
  const filter = { content: { $regex: regexMatched } }

  const total = await Message.countDocuments(filter)
  console.log(`Found ${total} matching message(s).`)

  if (total === 0) return process.exit(0)

  if (!doDelete) {
    const agg = await Message.aggregate([
      { $match: filter },
      { $group: { _id: '$roomId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
    console.log('Matching messages grouped by room (top 100):')
    agg.slice(0, 100).forEach(r => console.log(`  ${r._id} -> ${r.count}`))
    console.log('\nDRY RUN: no messages were deleted. To delete, re-run with `--yes`.')
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
