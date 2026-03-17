const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  category:    { type: String, required: true },
  description: { type: String, required: true },
  vendor:      { type: String, default: '' },
  amount:      { type: Number, required: true },
  paid:        { type: Boolean, default: false },
  dueDate:     { type: Date, default: null },
  note:        { type: String, default: '' },
}, { timestamps: true });

const budgetSchema = new mongoose.Schema({
  weddingId:   { type: String, default: 'default', unique: true },
  totalBudget: { type: Number, required: true, default: 1500000 },
  currency:    { type: String, default: 'INR' },
  entries:     [entrySchema],
}, { timestamps: true });

module.exports = mongoose.model('Budget', budgetSchema);
