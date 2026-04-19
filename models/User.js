import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: 'Chennai, Tamil Nadu, India'
  },
  lat: {
    type: Number,
    default: 12.9916 // Default Chennai Lat
  },
  lon: {
    type: Number,
    default: 80.2316 // Default Chennai Lon
  },
  savedDeals: [{
    name: String,
    price: String,
    currencySymbol: String,
    source: String,
    link: String,
    imageUrl: String,
    savedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);
