const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');

async function checkUsers() {
    try {
        console.log('Using MongoDB URI:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/moi-vibaram');
        console.log('Connected to MongoDB');

        const total = await User.countDocuments();
        console.log('Total users:', total);

        const roles = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);
        console.log('Users by role:', JSON.stringify(roles, null, 2));

        const sample = await User.find().limit(5).select('name role mobile');
        console.log('Sample users:', JSON.stringify(sample, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUsers();
