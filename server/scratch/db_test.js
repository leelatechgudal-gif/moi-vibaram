const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/moiapp');
const Transaction = mongoose.model('Transaction', new mongoose.Schema({ eventName: String, eventId: mongoose.Schema.Types.ObjectId, type: String }));
const Event = mongoose.model('Event', new mongoose.Schema({ eventName: String }));

async function run() {
  const txs = await Transaction.find().lean();
  console.log(`Total transactions: ${txs.length}`);
  const unmapped = txs.filter(t => !t.eventId);
  console.log(`Unmapped transactions (no eventId): ${unmapped.length}`);
  const unmappedReceived = unmapped.filter(t => t.type === 'received');
  console.log(`Unmapped RECEIVED transactions: ${unmappedReceived.length}`);
  
  const events = await Event.find().lean();
  console.log(`Total events: ${events.length}`);
  
  for (let e of events) {
    const mapped = txs.filter(t => t.eventId && t.eventId.toString() === e._id.toString());
    console.log(`Event "${e.eventName}" has ${mapped.length} transactions`);
  }
  process.exit(0);
}
run();
