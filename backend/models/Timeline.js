const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  id:          Number,
  time:        String,
  duration:    String,
  event:       String,
  description: String,
  category:    { type: String, enum: ['prep','ceremony','vendor','food','celebration','travel','buffer'] },
  assignedTo:  String,
  priority:    { type: String, enum: ['high','medium','low'], default: 'medium' },
  completed:   { type: Boolean, default: false },
}, { _id: false });

const timelineSchema = new mongoose.Schema({
  weddingId: { type: String, default: 'default', unique: true },
  brideName: String,
  groomName: String,
  weddingDate: String,
  events: [eventSchema],
  tips:   [String],
  brief:  mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('Timeline', timelineSchema);
