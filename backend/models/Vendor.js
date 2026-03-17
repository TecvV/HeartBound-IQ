const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  city:        { type: String, required: true },
  category:    { type: String, required: true },
  priceRange:  { type: String },
  phone:       { type: String },
  contact:     { type: String },
  minPrice:    { type: Number },
  maxPrice:    { type: Number },
  rating:      { type: Number },
  reviewCount: { type: Number, default: 0 },
  experience:  { type: String },
  style:       { type: String },
  portfolio:   { type: String },
  amenities:   [String],
  aiScore:     { type: Number, default: 0 },
  aiNote:      { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
