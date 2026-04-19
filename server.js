import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import User from './models/User.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Setup Multer for image upload (in memory)
const upload = multer({ storage: multer.memoryStorage() });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zencart';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-zencart-key';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('📦 Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));


// --- AUTHENTICATION ROUTES --- //

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, location } = req.body;
    
    // Quick validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Geocode location string to lat/lon using Nominatim
    let lat = 12.9916, lon = 80.2316; // default Chennai
    let finalLocation = location || 'Chennai, Tamil Nadu, India';

    if (location && location.trim() !== '') {
      try {
        const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`, {
          headers: { 'User-Agent': 'ZenCart-Auth' }
        });
        const geocodeData = await geocodeRes.json();
        if (geocodeData && geocodeData.length > 0) {
          lat = parseFloat(geocodeData[0].lat);
          lon = parseFloat(geocodeData[0].lon);
          finalLocation = location;
        }
      } catch (err) {
        console.error('Geocoding error during signup:', err);
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, location: finalLocation, lat, lon });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { email: user.email, location: user.location, lat: user.lat, lon: user.lon } });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { email: user.email, location: user.location, lat: user.lat, lon: user.lon } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});


// --- SEARCH API --- //

/**
 * Fetch live products from Serper.
 * Uses dynamic location from user.
 */
async function resolveGeo(locationName) {
  try {
    const geoRes = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Given the location string, output strict JSON with a 2-letter ISO country code "gl" and the region\'s native currency symbol "currency_symbol" (e.g., "$", "€", "₹", "£", "¥", "A$", "C$"). For example, Paris -> {"gl": "fr", "currency_symbol": "€"}.' },
        { role: 'user', content: locationName }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    });
    const geo = JSON.parse(geoRes.choices[0].message.content);
    return { gl: geo.gl?.toLowerCase() || 'us', currencySymbol: geo.currency_symbol || '$' };
  } catch (err) {
    console.error('Geo parsing error:', err);
    return { gl: 'us', currencySymbol: '$' };
  }
}

async function searchShopping(query, locationName, glCode) {
  try {
    const response = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: `${query} in ${locationName}`,
        gl: glCode || 'us',
        location: locationName,
        num: 8
      })
    });
    const data = await response.json();
    return data.shopping || [];
  } catch (error) {
    console.error('Serper Error:', error);
    return [];
  }
}

/**
 * Calculate road distance using OSRM based on store name and dynamic location.
 */
async function getDistance(storeName, userLat, userLon, locationName) {
  try {
    const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(storeName + ' ' + locationName)}&format=json&limit=1`, {
      headers: { 'User-Agent': 'ZenCart-Assistant' }
    });
    const geocodeData = await geocodeRes.json();
    if (!geocodeData?.length) return null;

    const storeLat = geocodeData[0].lat;
    const storeLon = geocodeData[0].lon;

    const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${userLon},${userLat};${storeLon},${storeLat}?overview=false`);
    const routeData = await routeRes.json();

    if (routeData.code !== 'Ok') return null;
    return (routeData.routes[0].distance * 0.000621371).toFixed(1);
  } catch {
    return null;
  }
}

app.post('/api/search', async (req, res) => {
  const { query, lat, lon, locationName = 'Chennai, Tamil Nadu, India' } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    const { gl, currencySymbol } = await resolveGeo(locationName);
    const rawProducts = await searchShopping(query, locationName, gl);

    const enrichedProducts = await Promise.all(rawProducts.map(async (item) => {
      let distance = null;
      // Filter out obvious online-only giants from proximity calculation
      const majorOnline = ['Amazon', 'Flipkart', 'eBay', 'Myntra', 'Ajio'];
      
      // We still include them, but distance is null.
      if (item.source && !majorOnline.some(m => item.source.includes(m))) {
        distance = await getDistance(item.source, lat || 12.9916, lon || 80.2316, locationName);
      }

      return {
        name: item.title,
        price: item.price,
        currencySymbol: currencySymbol,
        source: item.source,
        rating: item.rating ? parseFloat(item.rating) : 4.0,
        reviews: item.reviews || 0,
        link: item.link,
        imageUrl: item.imageUrl || '',
        distance_miles: distance ? parseFloat(distance) : null
      };
    }));

    const systemInstruction = `You are the Sandhai AI Engine. 
    You are strictly located in ${locationName}. 
    Analyze the provided product JSON. 
    Write a 2-sentence "summary" recommending the best value choice in ${locationName}. 
    You MUST also identify the exact 'name' string of the product you recommend.
    Response must be ONLY raw JSON conforming to the schema {"summary": "...", "best_product_name": "exact name of product"}.`;

    const llmProducts = enrichedProducts.map(p => ({ name: p.name, price: p.price, source: p.source, rating: p.rating }));

    const finalResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Current Products: ${JSON.stringify(llmProducts)}` }
      ],
      response_format: { type: "json_object" }
    });

    const llmVerdict = JSON.parse(finalResponse.choices[0].message.content);

    return res.json({
      products: enrichedProducts,
      summary: llmVerdict.summary || `Best options found for your search in ${locationName}.`,
      best_product_name: llmVerdict.best_product_name || null
    });

  } catch (error) {
    console.error('Final API Error:', error);
    return res.status(500).json({ error: 'Server could not process request' });
  }
});


// --- IMAGE SEARCH API --- //

app.post('/api/search/image', upload.single('image'), async (req, res) => {
  try {
    const { lat, lon, locationName = 'Chennai, Tamil Nadu, India' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Convert buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    // Use Groq Multimodal vision model to extract a search query
    // E.g. llama-3.2-11b-vision-preview or llama-3.2-90b-vision-preview
    const visionResponse = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        { 
          role: 'user', 
          content: [
            { type: "text", text: "Identify the main product in this image and provide a highly specific, short 3-5 word search query to find and buy this exact item online. ONLY output the search query." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 50
    });

    const extractedQuery = visionResponse.choices[0].message.content.trim().replace(/["']/g, '');
    console.log(`Vision model extracted query: ${extractedQuery}`);

    // Now cascade into the standard search pipeline
    const { gl, currencySymbol } = await resolveGeo(locationName);
    const rawProducts = await searchShopping(extractedQuery, locationName, gl);

    const enrichedProducts = await Promise.all(rawProducts.map(async (item) => {
      let distance = null;
      const majorOnline = ['Amazon', 'Flipkart', 'eBay', 'Myntra', 'Ajio'];
      
      if (item.source && !majorOnline.some(m => item.source.includes(m))) {
        distance = await getDistance(item.source, lat || 12.9916, lon || 80.2316, locationName);
      }

      return {
        name: item.title,
        price: item.price,
        currencySymbol: currencySymbol,
        source: item.source,
        rating: item.rating ? parseFloat(item.rating) : 4.0,
        reviews: item.reviews || 0,
        link: item.link,
        imageUrl: item.imageUrl || '',
        distance_miles: distance ? parseFloat(distance) : null
      };
    }));

    const systemInstruction = `You are the Sandhai AI Engine. You are strictly located in ${locationName}. Analyze the provided product JSON. Write a 2-sentence "summary" recommending the best value choice in ${locationName}. You MUST also identify the exact 'name' string of the product you recommend. Response must be ONLY raw JSON {"summary": "...", "best_product_name": "exact name of product"}.`;

    const llmProducts = enrichedProducts.map(p => ({ name: p.name, price: p.price, source: p.source, rating: p.rating }));

    const finalResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Current Products: ${JSON.stringify(llmProducts)}` }
      ],
      response_format: { type: "json_object" }
    });

    const llmVerdict = JSON.parse(finalResponse.choices[0].message.content);

    return res.json({
      queryIdentified: extractedQuery,
      products: enrichedProducts,
      summary: llmVerdict.summary || `Best options found in ${locationName}.`,
      best_product_name: llmVerdict.best_product_name || null
    });

  } catch (error) {
    console.error('Image Search API Error:', error);
    return res.status(500).json({ error: 'Server could not process image search' });
  }
});


// --- USER DATA API --- //

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch(e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/user/save', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.savedDeals.push(req.body.deal);
    await user.save();
    
    res.json({ success: true, savedDeals: user.savedDeals });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save deal' });
  }
});

app.post('/api/user/remove', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.savedDeals = user.savedDeals.filter(deal => deal.name !== req.body.dealName);
    await user.save();
    
    res.json({ success: true, savedDeals: user.savedDeals });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove deal' });
  }
});

app.get('/api/user/saved', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ savedDeals: user.savedDeals });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 ZenCart Backend live on port ${PORT}`));