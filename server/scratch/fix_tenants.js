/**
 * Fix Tenant Migration
 * ====================
 * The original migration had a bug: Mongoose defaults generated tenantId in memory
 * but the migration skipped saving because it saw the default as "already set".
 * This means users' tenantId was NEVER persisted to MongoDB.
 *
 * This script:
 * 1. Reads the actual raw documents from MongoDB (bypassing Mongoose defaults)
 * 2. Finds which tenantIds the parties actually have
 * 3. Maps users to their correct tenantId based on their transaction → party links
 * 4. Persists the tenantId to the user documents
 */

const mongoose = require('mongoose');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fix() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/moi-vibaram');
        console.log('✅ Connected.\n');

        const usersCol = mongoose.connection.collection('users');
        const partiesCol = mongoose.connection.collection('parties');
        const transactionsCol = mongoose.connection.collection('transactions');

        // ── Step 1: Check raw user documents ────────────────────────────
        console.log('── Step 1: Raw user documents ──');
        const rawUsers = await usersCol.find({}).toArray();
        for (const u of rawUsers) {
            console.log(`  User: "${u.name}" (${u.email})`);
            console.log(`    DB tenantId: ${u.tenantId || '❌ NOT SET'}`);
            console.log(`    DB tenantRole: ${u.tenantRole || '❌ NOT SET'}`);
        }

        // ── Step 2: Check party tenantIds ────────────────────────────────
        console.log('\n── Step 2: Party tenantIds in DB ──');
        const rawParties = await partiesCol.find({}).toArray();
        const tenantIdSet = new Set();
        for (const p of rawParties) {
            tenantIdSet.add(p.tenantId);
        }
        console.log(`  Unique tenantIds on parties: ${[...tenantIdSet].join(', ')}`);
        for (const tid of tenantIdSet) {
            const count = rawParties.filter(p => p.tenantId === tid).length;
            console.log(`    ${tid}: ${count} parties`);
        }

        // ── Step 3: Map users to the correct tenantId ────────────────────
        console.log('\n── Step 3: Fix user tenantIds ──');
        const rawTransactions = await transactionsCol.find({}).toArray();

        for (const user of rawUsers) {
            // Find transactions for this user
            const userTxns = rawTransactions.filter(t => t.userId.toString() === user._id.toString());

            if (userTxns.length > 0) {
                // Find a party that this user references via transactions
                const firstTxPartyId = userTxns[0].partyId;
                if (firstTxPartyId) {
                    const party = rawParties.find(p => p._id.toString() === firstTxPartyId.toString());
                    if (party && party.tenantId) {
                        console.log(`  ✅ User "${user.name}" (${user.email}) → tenantId: ${party.tenantId} (from transaction→party link)`);
                        await usersCol.updateOne(
                            { _id: user._id },
                            { $set: { tenantId: party.tenantId, tenantRole: 'owner' } }
                        );
                        continue;
                    }
                }
            }

            // No transactions → assign fresh tenantId if not already set
            if (!user.tenantId) {
                const newTenantId = uuidv4();
                console.log(`  🆕 User "${user.name}" (${user.email}) → tenantId: ${newTenantId} (no transactions, fresh)`);
                await usersCol.updateOne(
                    { _id: user._id },
                    { $set: { tenantId: newTenantId, tenantRole: 'owner' } }
                );
            } else {
                console.log(`  ⏭  User "${user.name}" (${user.email}) → tenantId already set: ${user.tenantId}`);
            }
        }

        // ── Step 4: Verify ──────────────────────────────────────────────
        console.log('\n── Step 4: Verification ──');
        const updatedUsers = await usersCol.find({}).toArray();
        for (const u of updatedUsers) {
            const partyCount = rawParties.filter(p => p.tenantId === u.tenantId).length;
            console.log(`  User "${u.name}" (${u.email}) → tenantId: ${u.tenantId} → ${partyCount} parties visible`);
        }

        console.log('\n══════════════════════════════════════');
        console.log('  FIX COMPLETE');
        console.log('══════════════════════════════════════');

        process.exit(0);
    } catch (err) {
        console.error('❌ Fix failed:', err);
        process.exit(1);
    }
}

fix();
