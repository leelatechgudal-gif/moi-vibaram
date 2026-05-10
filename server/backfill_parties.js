const mongoose = require('mongoose');
const Party = require('./models/Party');
const Transaction = require('./models/Transaction');
const User = require('./models/User');
require('dotenv').config();

async function backfill() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/moi-vibaram');
        console.log('Connected to MongoDB');

        const parties = await Party.find({ createdBy: { $exists: false } });
        console.log(`Found ${parties.length} parties without createdBy`);

        for (const party of parties) {
            // Find the first transaction for this party to infer creator
            const firstTx = await Transaction.findOne({ partyId: party._id }).sort({ createdAt: 1 });
            if (firstTx && firstTx.userId) {
                party.createdBy = firstTx.userId;
                await party.save();
                console.log(`Updated party ${party.name} with creator ${firstTx.userId}`);
            } else {
                // Fallback: use the tenant owner
                const owner = await User.findOne({ tenantId: party.tenantId, tenantRole: 'owner' });
                if (owner) {
                    party.createdBy = owner._id;
                    await party.save();
                    console.log(`Updated party ${party.name} with tenant owner ${owner._id}`);
                }
            }
        }

        console.log('Backfill complete');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

backfill();
