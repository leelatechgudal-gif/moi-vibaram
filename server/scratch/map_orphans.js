const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Event = require('../models/Event');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/moiapp').then(async () => {
  const orphans = await Transaction.find({ eventId: { $exists: false }, eventName: { $exists: true, $ne: null } });
  console.log('Found orphans:', orphans.length);
  for (let t of orphans) {
    if (t.eventName) {
      let event = await Event.findOne({ eventName: t.eventName, userId: t.userId });
      if (!event) {
        event = new Event({ eventName: t.eventName, date: t.date || Date.now(), userId: t.userId });
        await event.save();
      }
      t.eventId = event._id;
      await t.save();
    }
  }
  console.log('Done mapping.');
  process.exit(0);
}).catch(console.error);
