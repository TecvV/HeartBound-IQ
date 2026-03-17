const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema(
  {
    weddingId:    { type: String, default: 'default' },
    name:         { type: String, required: true },
    email:        { type: String, required: true },
    phone:        { type: String, default: '' },
    rsvpStatus:   { type: String, enum: ['pending', 'confirmed', 'declined'], default: 'pending' },
    rsvpCount:    { type: Number, default: null },
    rsvpRespondedAt: { type: Date, default: null },
    rsvpToken:    { type: String, default: '' },
    rsvpTokenCreatedAt: { type: Date, default: null },
    dietary:      { type: String, default: '' },
    tableNumber:  { type: Number, default: null },
    inviteSent:   { type: Boolean, default: false },
    inviteWithFamily: { type: Boolean, default: false },
    inviteSentAt: { type: Date, default: null },
    side:         { type: String, enum: ['bride', 'groom', 'both'], default: 'both' },
    notes:        { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Guest', guestSchema);
