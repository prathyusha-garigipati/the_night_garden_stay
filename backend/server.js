require('dotenv').config();

// prefer MONGO_URI but also accept MONGODB_URI for compatibility
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
console.log("ENV CHECK 👉", mongoUri);
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Booking = require("./models/Booking");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ✅ MongoDB URI (WITH DB NAME)


if (!mongoUri) {
  console.error("❌ MongoDB URI not set. Please set MONGO_URI or MONGODB_URI in your .env file.");
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error", err));

/* CREATE BOOKING */
app.post("/api/bookings", async (req, res) => {
  try {
    // Normalize date field names from frontend (some clients send checkin/checkout lowercase)
    const payload = Object.assign({}, req.body);
    if (payload.checkin && !payload.checkIn) payload.checkIn = payload.checkin;
    if (payload.checkout && !payload.checkOut) payload.checkOut = payload.checkout;

    const booking = new Booking(payload);
    await booking.save();
    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Booking save failed" });
  }
});

/* GET ALL BOOKINGS */
app.get("/api/bookings", async (req, res) => {
  const bookings = await Booking.find().sort({ _id: -1 });
  res.json(bookings);
});

/* UPDATE STATUS */
app.patch("/api/bookings/:id", async (req, res) => {
  const updated = await Booking.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  res.json(updated);
});

/* DELETE BOOKING */
app.delete("/api/bookings/:id", async (req, res) => {
  await Booking.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
