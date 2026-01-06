/* Seed 100 farmers, 100 buyers, and sample transactions.
   Usage: NODE_ENV=development node scripts/seedUsersAndTransactions.js
   Requires ATLASDB_URL/.env or defaults to local mongo. */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const FarmerLogin = require('../models/loginFarmer');
const BuyerLogin = require('../models/loginbuyer');
const { SoldInventory } = require('../models/totalInventorySchema');

const defaultDbName = process.env.DB_NAME || 'cropconnect';
const rawUri = process.env.ATLASDB_URL;

function buildMongoUri(rawUrl) {
  if (!rawUrl) return `mongodb://127.0.0.1:27017/${defaultDbName}`;
  const hasDbPath = /\/[^/?]+(\?|$)/.test(rawUrl.replace(/^mongodb\+srv:\/\//, 'mongodb://'));
  if (hasDbPath) return rawUrl;
  return rawUrl.replace(/\/(\?|$)/, `/${defaultDbName}$1`);
}

const mongoUri = buildMongoUri(rawUri);

const locations = [
  'Hyderabad', 'Bengaluru', 'Chennai', 'Pune', 'Delhi',
  'Kolkata', 'Mumbai', 'Jaipur', 'Lucknow', 'Ahmedabad'
];

const coords = [
  [78.4867, 17.3850], // Hyderabad
  [77.5946, 12.9716], // Bengaluru
  [80.2707, 13.0827], // Chennai
  [73.8567, 18.5204], // Pune
  [77.1025, 28.7041], // Delhi
  [88.3639, 22.5726], // Kolkata
  [72.8777, 19.0760], // Mumbai
  [75.7873, 26.9124], // Jaipur
  [80.9462, 26.8467], // Lucknow
  [72.5714, 23.0225], // Ahmedabad
];

const crops = ['rice', 'wheat', 'maize', 'soya', 'cotton', 'sugarcane', 'pulses', 'millet'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedFarmers(count = 100) {
  const farmers = [];
  for (let i = 0; i < count; i++) {
    const idx = String(i + 1).padStart(3, '0');
    const location = pick(locations);
    farmers.push({
      name: `Farmer ${idx}`,
      email: `farmer${idx}@gmail.com`,
      username: `farmer${idx}`,
      location
    });
  }

  let created = 0;
  for (const f of farmers) {
    try {
      await FarmerLogin.register(new FarmerLogin(f), 'Secret123!');
      created++;
    } catch (e) {
      if (e.code === 11000) continue; // duplicate username/email
      console.error('Farmer seed error:', f.username, e.message);
    }
  }
  return created;
}

async function seedBuyers(count = 100) {
  const buyers = [];
  for (let i = 0; i < count; i++) {
    const idx = String(i + 1).padStart(3, '0');
    const location = pick(locations);
    const coord = coords[locations.indexOf(location)] || pick(coords);
    buyers.push({
      name: `Buyer ${idx}`,
      email: `buyer${idx}@gmail.com`,
      username: `buyer${idx}`,
      location,
      geometry: { type: 'Point', coordinates: coord }
    });
  }

  let created = 0;
  for (const b of buyers) {
    try {
      const doc = new BuyerLogin(b);
      await BuyerLogin.register(doc, 'Secret123!');
      created++;
    } catch (e) {
      if (e.code === 11000) continue;
      console.error('Buyer seed error:', b.username, e.message);
    }
  }
  return created;
}

async function seedTransactions(count = 50) {
  const farmers = await FarmerLogin.find({}, '_id').lean();
  if (!farmers.length) return 0;
  const txns = [];
  for (let i = 0; i < count; i++) {
    const farmer = pick(farmers);
    const itemCount = 1 + Math.floor(Math.random() * 3);
    const inventory = Array.from({ length: itemCount }).map(() => {
      const crop = pick(crops);
      const quantity = 50 + Math.floor(Math.random() * 150);
      const price = 20 + Math.floor(Math.random() * 40);
      return { crop, quantity, price };
    });
    txns.push({ farmer: farmer._id, inventory });
  }
  await SoldInventory.insertMany(txns, { ordered: false });
  return txns.length;
}

async function main() {
  console.log(`Connecting to ${mongoUri} ...`);
  await mongoose.connect(mongoUri, { dbName: defaultDbName });
  console.log('✅ Mongo connected');

  const farmersAdded = await seedFarmers(100);
  const buyersAdded = await seedBuyers(100);
  const txAdded = await seedTransactions(50);

  console.log(`✅ Farmers added: ${farmersAdded}`);
  console.log(`✅ Buyers added: ${buyersAdded}`);
  console.log(`✅ Transactions added: ${txAdded}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Seed script failed:', err);
  process.exit(1);
});

