# Sandhai
A magnificent, highly functional global E-commerce assistant using React, Node.js, MongoDB, and the Groq API (Llama 3).

## Features
- **Global Currency Engine**: Automatically resolves user cities via an LLM micro-pass to fetch perfectly localized URLs and precise international currencies (₹, €, £, ¥, etc) natively from Google.
- **Generative Vision Search**: Simply drop an image into the command bar; the Vision model identifies the product and seamlessly cascades it into the shopping matrix.
- **Saved Treasury Vault**: MongoDB-backed persistent database allowing users to securely save and revisit found deals without losing native currency contexts or external routing links.
- **Visual Decision Matrix**: An auto-generated table comparing price, rating, and local distance. 
- **Premium Fluid UI**: Features a sleek Light/Dark theme toggle and an interactive, animated progress bar simulating search statuses.
- **100% Free Live APIs**: Uses Groq (Llama-3 for speed), Serper.dev (Google Shopping), and OpenStreetMap (Routing).
- **Budget Toggle**: Instant, client-side re-ranking to prioritize lower prices.
- **Summary Mode**: A 2-sentence AI-generated verdict on the best value item customized for your region.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Rename `.env.example` to `.env` and fill in your keys:
   - `GROQ_API_KEY`: Get it from [Groq Console](https://console.groq.com/) (Extremely fast, free access during beta).
   - `SERPER_API_KEY`: Get it from [Serper.dev](https://serper.dev/) (2500 free queries, no card required).
   - `MONGODB_URI`: Connect your MongoDB Atlas string (e.g. `mongodb+srv://...` or `mongodb://127.0.0.1:27017` for local testing).
   - `JWT_SECRET`: A simple secure string for JSON Web Token user auth.

3. **Start the applications**
   You'll need two terminal windows:
   
   **Terminal 1 (Backend - Port 3001)**
   ```bash
   npm run server
   ```

   **Terminal 2 (Frontend - Port 5173)**
   ```bash
   npm run dev
   ```

## Logical Flow
1. **User Intent**: The user submits a text search (or uploads an image containing an object) into the minimalist command bar.
2. **Geo-Resolution**: The backend parses the user's saved profile city through Groq to instantly identify the Google region code (`gl`) and regional pricing symbol.
3. **Data Fetching**: The `searchShopping` utility queries live listings while preserving regional constraints. Physical stores check driving miles from the user using Nominatim + OSRM.
4. **Synthesis**: Groq synthesizes all the unstructured data to construct a decisive "Sandhai Verdict", highlighting the topmost valuable pick locally.
5. **Frontend Rendering**: The matrix table flawlessly renders the items, allowing instant Budget mode sorting and one-click cloud Saving.
