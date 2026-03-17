const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema(
  {
    weddingId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String },
    capacity: { type: Number },
    pricePerHead: { type: Number },           // INR
    totalEstimatedCost: { type: Number },
    rating: { type: Number, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    amenities: [String],
    venueType: {
      type: String,
      enum: ['banquet_hall', 'farmhouse', 'hotel', 'resort', 'outdoor', 'heritage'],
    },
    images: [String],
    phone: String,
    contactPhone: String,
    contactEmail: String,
    googlePlaceId: String,
    latitude: Number,
    longitude: Number,
    distanceFromCenter: Number,              // km
    aiScore: { type: Number, default: 0 },   // Computed by Venue Scout Agent
    aiRecommendation: String,                // Agent's summary
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Venue', venueSchema);
