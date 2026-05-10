/**
 * Tenant Migration Script
 * =======================
 * This one-time migration script:
 * 1. Assigns a UUID tenantId to every User who doesn't have one
 * 2. Assigns each Party to the correct tenant based on Transaction references
 * 3. Assigns orphaned parties (no transactions) to the "anand" user's tenant
 * 4. Drops the old unique index on Party and creates the new tenant-aware one
 *
 * USAGE:
 *   node server/scratch/migrate_tenants.js
 *
 * WARNING: Take a MongoDB backup before running!
 */

const mongoose = require('mongoose');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Party = require('../models/Party');
const Transaction = require('../models/Transaction');

async function migrate() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/moi-vibaram');
        console.log('✅ Connected.\n');

        // ── Step 1: Assign tenantId to all Users ────────────────────────
        console.log('── Step 1: Assign tenantId to Users ──');
        const users = await User.find({});
        let usersPatched = 0;
        for (const user of users) {
            if (!user.tenantId) {
                user.tenantId = uuidv4();
                user.tenantRole = 'owner';
                await user.save();
                usersPatched++;
                console.log(`  ✅ User "${user.name}" (${user.email}) → tenantId: ${user.tenantId}`);
            } else {
                console.log(`  ⏭  User "${user.name}" already has tenantId: ${user.tenantId}`);
            }
        }
        console.log(`  → ${usersPatched} users patched.\n`);

        // Reload users to get updated tenantIds
        const allUsers = await User.find({});
        const userMap = {};
        allUsers.forEach(u => { userMap[u._id.toString()] = u; });

        // ── Step 2: Find the "anand" user ───────────────────────────────
        console.log('── Step 2: Find "anand" user ──');
        const anandUser = allUsers.find(u => u.email && u.email.toLowerCase().startsWith('anand'));
        if (!anandUser) {
            console.error('❌ No user with email starting with "anand" found! Aborting.');
            process.exit(1);
        }
        console.log(`  → Primary tenant owner: "${anandUser.name}" (${anandUser.email}) → tenantId: ${anandUser.tenantId}\n`);

        // ── Step 3: Assign parties to tenants based on transactions ─────
        console.log('── Step 3: Assign parties to tenants ──');
        const allParties = await Party.find({});
        const allTransactions = await Transaction.find({});

        // Build a map: partyId → Set of userIds who reference that party
        const partyUserMap = {};
        allTransactions.forEach(tx => {
            if (!tx.partyId) return;
            const pid = tx.partyId.toString();
            if (!partyUserMap[pid]) partyUserMap[pid] = new Set();
            partyUserMap[pid].add(tx.userId.toString());
        });

        let partiesAssignedByTx = 0;
        let partiesAssignedToAnand = 0;
        let partiesAlreadyDone = 0;

        for (const party of allParties) {
            if (party.tenantId) {
                partiesAlreadyDone++;
                continue;
            }

            const pid = party._id.toString();
            const referencingUserIds = partyUserMap[pid];

            if (referencingUserIds && referencingUserIds.size > 0) {
                // Party is referenced in transactions — assign to the first referencing user's tenant
                const firstUserId = [...referencingUserIds][0];
                const owner = userMap[firstUserId];
                if (owner) {
                    party.tenantId = owner.tenantId;
                    await party.save();
                    partiesAssignedByTx++;
                    console.log(`  📎 Party "${party.name}" → tenant of "${owner.name}" (via transaction)`);
                } else {
                    // Fallback to anand
                    party.tenantId = anandUser.tenantId;
                    await party.save();
                    partiesAssignedToAnand++;
                    console.log(`  📦 Party "${party.name}" → anand tenant (user not found)`);
                }
            } else {
                // Orphaned party — assign to anand
                party.tenantId = anandUser.tenantId;
                await party.save();
                partiesAssignedToAnand++;
                console.log(`  📦 Party "${party.name}" → anand tenant (no transactions)`);
            }
        }

        console.log(`  → ${partiesAssignedByTx} assigned by transaction reference`);
        console.log(`  → ${partiesAssignedToAnand} assigned to anand (orphaned)`);
        console.log(`  → ${partiesAlreadyDone} already had tenantId\n`);

        // ── Step 4: Fix unique index ────────────────────────────────────
        console.log('── Step 4: Update unique index ──');
        try {
            const collection = mongoose.connection.collection('parties');
            
            // Drop old index if it exists
            const indexes = await collection.indexes();
            const oldIndex = indexes.find(idx => 
                idx.key && idx.key.name === 1 && idx.key.mobile === 1 && !idx.key.tenantId
            );
            if (oldIndex) {
                await collection.dropIndex(oldIndex.name);
                console.log(`  🗑  Dropped old index: ${oldIndex.name}`);
            } else {
                console.log('  ⏭  Old index not found (may already be updated)');
            }

            // Create the new tenant-aware unique index
            await collection.createIndex(
                { name: 1, mobile: 1, tenantId: 1 },
                { unique: true }
            );
            console.log('  ✅ Created new index: { name, mobile, tenantId } (unique)\n');
        } catch (indexErr) {
            console.error('  ⚠️  Index update issue (may already exist):', indexErr.message);
        }

        // ── Summary ─────────────────────────────────────────────────────
        console.log('══════════════════════════════════════');
        console.log('  MIGRATION COMPLETE');
        console.log(`  Users: ${allUsers.length} total, ${usersPatched} patched`);
        console.log(`  Parties: ${allParties.length} total`);
        console.log(`    → ${partiesAssignedByTx} by tx reference`);
        console.log(`    → ${partiesAssignedToAnand} to anand`);
        console.log(`    → ${partiesAlreadyDone} already done`);
        console.log('══════════════════════════════════════');

        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
