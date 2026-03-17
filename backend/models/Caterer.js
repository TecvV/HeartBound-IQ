const mongoose = require('mongoose');

const catererSchema = new mongoose.Schema({
  name:               { type: String, required: true },
  city:               { type: String, required: true },
  cuisines:           [String],
  pricePerHead:       { type: Number },
  totalEstimatedCost: { type: Number },
  rating:             { type: Number, min: 0, max: 5 },
  reviewCount:        { type: Number, default: 0 },
  description:        { type: String },
  packages:           [String],
  amenities:          [String],
  contact:            { type: String },
  aiScore:            { type: Number, default: 0 },
  aiNote:             { type: String },
  selected:           { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Caterer', catererSchema);
