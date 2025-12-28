const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  name: String,
  email: String,  
  phone: String,
  checkIn: String,
  checkOut: String,
  guests: Number,
  message: String,
  payment:Object,

  aadhaarImage: String, // 👈 Base64 string

  status: {
    type: String,
    default: "pending"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);
