const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const selectionSchema = new mongoose.Schema({
  name:            String,
  address:         String,
  phone:           String,
  pricePerHead:    Number,
  priceRange:      String,
  totalEstimatedCost: Number,
  rating:          Number,
  reviewCount:     Number,
  aiScore:         Number,
  aiRecommendation:String,
  aiNote:          String,
  aiJustification: String,
  source:          String,
  amenities:       [String],
  venueType:       String,
  style:           String,
  experience:      String,
  cuisines:        [String],
  category:        String,
  confirmedAt:     Date,      // when user clicked "Finalize"
}, { _id: false });

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },

  wedding: {
    brideName:    { type: String, default: '' },
    groomName:    { type: String, default: '' },
    weddingDate:  { type: String, default: '' },
    ceremonyTime: { type: String, default: '7:00 PM' },
    city:         { type: String, default: '' },
    venue:        { type: String, default: '' },
    totalBudget:  { type: Number, default: 0 },
    guestCount:   { type: Number, default: 0 },
    religion:     { type: String, default: 'Hindu' },
    cuisines:     [String],
    hasBaraat:    { type: Boolean, default: true },
    hasMehendi:   { type: Boolean, default: true },
    hasSangeet:   { type: Boolean, default: true },
    hasHaldi:     { type: Boolean, default: false },
    cardDesignIndex: { type: Number, default: 1 },
  },

  planStatus: { type: String, enum: ['none','running','ready'], default: 'none' },
  planRunAt:  { type: Date },
  lastPlan:   { type: mongoose.Schema.Types.Mixed, default: null },

  // Selections (selected + confirmed separately)
  selections: {
    venue:        { type: selectionSchema, default: null },
    caterer:      { type: selectionSchema, default: null },
    photographer: { type: selectionSchema, default: null },
    decorator:    { type: selectionSchema, default: null },
    dj:           { type: selectionSchema, default: null },
  },

  // Confirmed flags — only set when user clicks "Finalize"
  confirmed: {
    venue:        { type: Boolean, default: false },
    caterer:      { type: Boolean, default: false },
    photographer: { type: Boolean, default: false },
    decorator:    { type: Boolean, default: false },
    dj:           { type: Boolean, default: false },
  },

  // Published website URL (after launch)
  websiteUrl:       { type: String, default: '' },
  websiteHtml:      { type: String, default: '' },
  cardHtml:         { type: String, default: '' },

  // Card / PDF / Website finalization states
  cardFinalized:     { type: Boolean, default: false },
  cardFinalizedAt:   { type: Date, default: null },

  pdfHtml:           { type: String, default: '' },
  pdfGeneratedAt:    { type: Date, default: null },
  pdfDownloadedAt:   { type: Date, default: null },
  pdfFinalized:      { type: Boolean, default: false },
  pdfFinalizedAt:    { type: Date, default: null },

  websiteData:       { type: mongoose.Schema.Types.Mixed, default: null },
  websiteGeneratedAt:{ type: Date, default: null },
  websiteFinalized:  { type: Boolean, default: false },
  websiteFinalizedAt:{ type: Date, default: null },

  // Track whether bulk invite has been sent
  allInvitesSentAt: { type: Date, default: null },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Helper: are all 5 categories confirmed?
userSchema.methods.allConfirmed = function() {
  const c = this.confirmed || {};
  return !!(c.venue && c.caterer && c.photographer && c.decorator && c.dj);
};

module.exports = mongoose.model('User', userSchema);
