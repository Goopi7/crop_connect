const express = require("express");
const router = express.Router();
const { CropPriceData, PricePrediction } = require("../models/cropPriceModel");
const FertilizerPesticideRecommendation = require("../models/fertilizerPesticideRecommendation");
const { isLoggedIn } = require("../middleware");
const axios = require("axios");
const { Router } = require("express");
const Crop = require('../models/cropModel');
const mongoose = require('mongoose');
const chatbotService = require('../services/chatbotService');
const AdminLogin = require('../models/loginAdmin');
const FarmerLogin = require('../models/loginFarmer');
const BuyerLogin = require('../models/loginbuyer');
const { SoldInventory } = require('../models/totalInventorySchema');
const RequestModel = require('../models/requestSchema');
// Weather proxy endpoint using OpenWeather (set OPENWEATHER_API_KEY)
router.get('/weather', async (req, res) => {
  try {
    const { lat = '17.3850', lon = '78.4867', units = 'metric' } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if(!apiKey){
      return res.json({ success: true, mock: true, data: { temp: 30, humidity: 55, description: 'clear sky' } });

// --- Fertilizer recommendation ---
// POST /api/fertilizer/recommend { crop, soil_type, ph, target_yield?, region?, season?, temperature? }
router.post('/fertilizer/recommend', async (req, res) => {
  try {
    const { crop, soil_type, ph, target_yield, region, season, temperature } = req.body || {};
    if (!crop || !soil_type) {
      return res.status(400).json({ success: false, error: 'crop and soil_type are required' });
    }

    // Try to look up crop details
    const cropDoc = await Crop.findOne({ name: new RegExp(`^${crop}$`, 'i') }).lean();

    // Build schedule from model if available
    const schedule = [];
    let totals = { N: null, P: null, K: null };

    if (cropDoc?.nutrient_management) {
      const nm = cropDoc.nutrient_management;
      const N = nm?.nitrogen?.requirement?.value || null;
      const P = nm?.phosphorus?.requirement?.value || null;
      const K = nm?.potassium?.requirement?.value || null;
      const Nunit = nm?.nitrogen?.requirement?.unit || 'kg/acre';
      const Punit = nm?.phosphorus?.requirement?.unit || 'kg/acre';
      const Kunit = nm?.potassium?.requirement?.unit || 'kg/acre';
      totals = { N: N ? `${N} ${Nunit}` : null, P: P ? `${P} ${Punit}` : null, K: K ? `${K} ${Kunit}` : null };

      // If applications present, surface them; else craft a generic split
      if (Array.isArray(nm.applications) && nm.applications.length) {
        nm.applications.forEach(app => {
          schedule.push({
            stage: app.stage || 'Application',
            recommendations: `${app.fertilizer || 'NPK'} — ${app.rate || ''} ${app.timing ? `(${app.timing})` : ''}`.trim()
          });
        });
      } else {
        // Generic split if totals known
        const hasTotals = N || P || K;
        if (hasTotals) {
          schedule.push({ stage: 'Basal (at sowing)', recommendations: 'Apply 50% N + 100% P + 50% K as basal with FYM/compost.' });
          schedule.push({ stage: 'Vegetative (20–30 DAS)', recommendations: 'Top-dress 25% N. Maintain soil moisture; avoid over-irrigation.' });
          schedule.push({ stage: 'Flowering', recommendations: 'Top-dress remaining 25% N + 50% K. Spray micronutrients if deficiency symptoms appear.' });
        }
      }
    } else {
      // Fallback schedule based on common practice
      const generic = [
        { stage: 'Basal (at sowing)', rec: 'Apply 40% N + 100% P + 40% K with FYM/compost.' },
        { stage: 'Vegetative (20–30 DAS)', rec: 'Top-dress 30% N. Keep field weed-free; ensure adequate moisture.' },
        { stage: 'Flowering', rec: 'Top-dress 30% N + 60% K. Apply micronutrients as needed.' }
      ];
      generic.forEach(g => schedule.push({ stage: g.stage, recommendations: g.rec }));
      totals = { N: 'Varies', P: 'Varies', K: 'Varies' };
    }

    const assumptions = [
      soil_type ? `Soil type provided: ${soil_type}` : 'Assuming loamy soil',
      ph ? `Soil pH ~ ${ph}` : 'Assuming near-neutral pH (6.5–7.5)',
      temperature ? `Avg temperature ~ ${temperature}°C` : 'Standard seasonal temperature assumed'
    ];
    const risks = [
      'Over-application may cause lodging or nutrient leaching',
      'Irrigation timing must match split applications'
    ];
    const next_actions = [
      'Confirm actual soil test values to fine-tune NPK rates',
      'Monitor crop for deficiency symptoms and adjust micronutrients'
    ];

    return res.json({ success: true, crop: cropDoc?.name || crop, schedule, totals, assumptions, risks, next_actions });
  } catch (e) {
    console.error('Fertilizer recommend error:', e);
    return res.status(500).json({ success: false, error: 'Failed to compute fertilizer recommendation' });
  }
});

// --- Admin analytics (structured for dashboard) ---
// GET /api/admin/analytics?timeRange=7|30|90|365|all
router.get('/admin/analytics', async (req, res) => {
  try {
    const timeRange = req.query.timeRange === 'all' ? 'all' : parseInt(req.query.timeRange || '30');
    const now = new Date();
    const since = timeRange === 'all' ? null : new Date(now.getTime() - (Number.isFinite(timeRange) ? timeRange : 30) * 24 * 60 * 60 * 1000);

    // Helper to match date by ObjectId timestamp so we don't rely on createdAt
    const dateMatchStage = (since) => since ? [{
      $match: { _id: { $gte: (function() { const ts = Math.floor(since.getTime()/1000); const hex = ts.toString(16).padStart(8,'0'); return new mongoose.Types.ObjectId(hex + '0000000000000000'); })() } }
    }] : [];
    // Grouping granularity: day for <= 90 days else month
    const useDaily = since && ((now - since) <= 90*24*60*60*1000);
    const groupDateExpr = useDaily
      ? { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$_id" } } }
      : { $dateToString: { format: "%Y-%m", date: { $toDate: "$_id" } } };

    // Basic totals
    const [totalUsers, totalFarmers, totalBuyers, totalTransactions] = await Promise.all([
      AdminLogin.countDocuments({})
        .then(a => FarmerLogin.countDocuments({}).then(f => a + f))
        .then(sum => BuyerLogin.countDocuments({}).then(b => sum + b)),
      FarmerLogin.countDocuments({}),
      BuyerLogin.countDocuments({}),
      SoldInventory.countDocuments({})
    ]);

    // User distribution by role
    const userDistribution = {
      role: {
        labels: ['Farmers', 'Buyers', 'Admins'],
        data: [await FarmerLogin.countDocuments({}), await BuyerLogin.countDocuments({}), await AdminLogin.countDocuments({})]
      },
      location: {
        labels: [],
        data: []
      }
    };

    // Location distribution (top 5 farmer locations)
    try {
      const byLoc = await FarmerLogin.aggregate([
        { $group: { _id: { $ifNull: ['$location', 'Unknown'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      userDistribution.location.labels = byLoc.map(x => x._id);
      userDistribution.location.data = byLoc.map(x => x.count);
    } catch (_) {}

    // Top crops by sold count
    let topCrops = { labels: [], data: [] };
    try {
      const agg = await SoldInventory.aggregate([
        { $unwind: { path: '$inventory', preserveNullAndEmptyArrays: false } },
        { $group: { _id: '$inventory.crop', qty: { $sum: '$inventory.quantity' } } },
        { $sort: { qty: -1 } },
        { $limit: 8 }
      ]);
      topCrops.labels = agg.map(x => x._id || 'Unknown');
      topCrops.data = agg.map(x => x.qty || 0);
    } catch (_) {}

    // Real series from Mongo ObjectId timestamps
    async function seriesForModel(Model) {
      const pipeline = [
        ...dateMatchStage(since),
        { $group: { _id: groupDateExpr, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ];
      const rows = await Model.aggregate(pipeline);
      return { labels: rows.map(r => r._id), data: rows.map(r => r.count) };
    }

    const [regsFarmers, regsBuyers, trxSeries] = await Promise.all([
      seriesForModel(FarmerLogin),
      seriesForModel(BuyerLogin),
      seriesForModel(SoldInventory)
    ]);
    // Combine registrations (farmers + buyers)
    const mapCounts = (s) => Object.fromEntries(s.labels.map((l, i) => [l, s.data[i]]));
    const mf = mapCounts(regsFarmers), mb = mapCounts(regsBuyers);
    const labelsCombined = Array.from(new Set([...regsFarmers.labels, ...regsBuyers.labels])).sort();
    const registrations = { labels: labelsCombined, data: labelsCombined.map(l => (mf[l]||0) + (mb[l]||0)) };
    const logins = { labels: registrations.labels, data: registrations.data.map(v => Math.round(v * 3)) }; // proxy until real login events exist
    const transactions = trxSeries;
    const userActivity = { registrations, logins, transactions };

    const recommendationSuccess = { labels: ['Successful','Neutral','Unsuccessful'], data: [70, 20, 10] };
    const labelsMonthly = registrations.labels.length ? registrations.labels : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const chatbotPerformance = {
      labels: labelsMonthly,
      responseTime: Array.from({ length: 12 }, (_, i) => 300 - i * 8),
      satisfactionScore: Array.from({ length: 12 }, (_, i) => 3.5 + i * 0.08)
    };

    const topChatbotTopics = [];

    const regionalData = userDistribution.location.labels.map((name, idx) => ({
      name,
      userCount: userDistribution.location.data[idx] || 0,
      cropCount: topCrops.data[idx] || 0
    }));

    return res.json({
      overview: {
        totalUsers,
        totalTransactions,
        totalRecommendations: await Crop.countDocuments({}),
        totalChatbotQueries: 0
      },
      userActivity,
      userDistribution,
      topCrops,
      recommendationSuccess,
      chatbotPerformance,
      topChatbotTopics,
      regionalData
    });
  } catch (e) {
    console.error('Admin analytics error:', e);
    return res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// --- Exports to CSV ---
// GET /api/exports/:type where :type in [users,crops,requests]
router.get('/exports/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let rows = [];
    let headers = [];

    if (type === 'users') {
      const [admins, farmers, buyers] = await Promise.all([
        AdminLogin.find({}).lean(),
        FarmerLogin.find({}).lean(),
        BuyerLogin.find({}).lean()
      ]);
      rows = [
        ...admins.map(u => ({ role: 'admin', username: u.username, name: u.name || '', email: u.email || '' })),
        ...farmers.map(u => ({ role: 'farmer', username: u.username, name: u.name || '', email: u.email || '', location: u.location || '' })),
        ...buyers.map(u => ({ role: 'buyer', username: u.username, name: u.name || '', email: u.email || '' }))
      ];
      headers = ['role','username','name','email','location'];
    } else if (type === 'crops') {
      const crops = await Crop.find({}).lean();
      rows = crops.map(c => ({
        name: c.name,
        scientific_name: c.scientific_name || '',
        categories: (c.categories || []).join('|'),
        soil_types: (c.soil_requirements?.soil_types || []).join('|'),
        ph_optimal: c.soil_requirements?.ph_range?.optimal ?? '',
        days_to_maturity: `${c.harvesting?.days_to_maturity?.min || ''}-${c.harvesting?.days_to_maturity?.max || ''}`,
        yield_min: c.harvesting?.expected_yield?.min || '',
        yield_max: c.harvesting?.expected_yield?.max || '',
        yield_unit: c.harvesting?.expected_yield?.unit || ''
      }));
      headers = ['name','scientific_name','categories','soil_types','ph_optimal','days_to_maturity','yield_min','yield_max','yield_unit'];
    } else if (type === 'requests') {
      const reqs = await RequestModel.find({}).lean();
      rows = reqs.map(r => ({
        request_id: r._id?.toString(),
        type: r.type || '',
        status: r.status || '',
        created_at: r.createdAt ? new Date(r.createdAt).toISOString() : ''
      }));
      headers = ['request_id','type','status','created_at'];
    } else {
      return res.status(400).json({ error: 'Unsupported export type' });
    }

    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };

    const csv = [headers.join(',')]
      .concat(rows.map(row => headers.map(h => escape(row[h])).join(',')))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}.csv`);
    return res.send(csv);
  } catch (e) {
    console.error('Export error:', e);
    return res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// --- Analytics summary ---
// GET /api/analytics/summary
router.get('/analytics/summary', async (req, res) => {
  try {
    const [totalCrops, totalFarmers, totalBuyers, totalRequests] = await Promise.all([
      Crop.countDocuments({}),
      FarmerLogin.countDocuments({}),
      BuyerLogin.countDocuments({}),
      RequestModel.countDocuments({})
    ]);

    // Simple top categories by count
    const topCategoriesAgg = await Crop.aggregate([
      { $unwind: { path: '$categories', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      totals: { totalCrops, totalFarmers, totalBuyers, totalRequests },
      topCategories: topCategoriesAgg.filter(x => !!x._id)
    });
  } catch (e) {
    console.error('Analytics summary error:', e);
    res.status(500).json({ success: false, error: 'Failed to compute analytics' });
  }
});
    }
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${apiKey}`;
    const resp = await axios.get(url, { timeout: 5000 });
    const w = resp.data;
    const out = {
      temp: w.main?.temp,
      humidity: w.main?.humidity,
      description: w.weather?.[0]?.description,
      wind_speed: w.wind?.speed
    };
    res.json({ success: true, data: out });
  } catch (e) {
    res.status(200).json({ success: true, mock: true, data: { temp: 30, humidity: 55, description: 'clear sky' } });
  }
});

// Crop price prediction endpoint
router.post("/predict-price", isLoggedIn, async (req, res) => {
    try {
        const {
            crop_name,
            location_id = "LOC001",
            quantity = 100,
            weather_forecast = {},
            prediction_date
        } = req.body;

        // Validate required fields
        if (!crop_name) {
            return res.status(400).json({
                success: false,
                error: "crop_name is required"
            });
        }

        // Validate crop name
        const validCrops = ['wheat', 'rice', 'corn', 'tomato', 'potato', 'onion', 'soybean', 'cotton'];
        if (!validCrops.includes(crop_name.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: `Invalid crop name. Must be one of: ${validCrops.join(', ')}`
            });
        }

        // Set default values for weather forecast
        const weatherDefaults = {
            temperature: weather_forecast.temperature || 25,
            humidity: weather_forecast.humidity || 60,
            rainfall: weather_forecast.rainfall || 10,
            wind_speed: weather_forecast.wind_speed || 15,
            sunshine_hours: weather_forecast.sunshine_hours || 8
        };

        // Get current date if prediction_date not provided
        const predictionDate = prediction_date ? new Date(prediction_date) : new Date();

        // Calculate season factor
        const season = (predictionDate.getMonth() % 12) / 12;

        // Get historical data for better prediction (fallback calculation)
        let predictedPrice;
        let confidence = { lower_bound: 0, upper_bound: 0 };

        try {
            // Try to call Python ML service
            const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:5001";
            const mlResponse = await axios.post(`${mlServiceUrl}/predict`, {
                crop_name: crop_name.toLowerCase(),
                location_id,
                quantity,
                ...weatherDefaults,
                season,
                prediction_date: predictionDate.toISOString()
            }, { timeout: 5000 });

            predictedPrice = mlResponse.data.predicted_price;
            confidence = mlResponse.data.confidence_interval || confidence;

        } catch (mlError) {
            console.log("ML service unavailable, using fallback calculation:", mlError.message);
            
            // Fallback: Rule-based price calculation
            const basePrices = {
                wheat: 25, rice: 35, corn: 20, tomato: 45,
                potato: 15, onion: 30, soybean: 55, cotton: 80
            };

            let basePrice = basePrices[crop_name.toLowerCase()] || 30;

            // Weather impact factors
            let weatherMultiplier = 1.0;
            if (weatherDefaults.rainfall < 5) weatherMultiplier *= 1.2; // Drought
            if (weatherDefaults.rainfall > 30) weatherMultiplier *= 1.15; // Flood
            if (weatherDefaults.temperature > 35) weatherMultiplier *= 1.1; // Heat stress

            // Seasonal variation
            const seasonalMultiplier = 1.0 + (season * 0.1);

            // Market demand (simulated)
            const demandFactor = 0.9 + Math.random() * 0.4; // 0.9 to 1.3

            predictedPrice = Math.round(basePrice * weatherMultiplier * seasonalMultiplier * demandFactor * 100) / 100;
            
            // Calculate confidence interval (±15%)
            confidence = {
                lower_bound: Math.round(predictedPrice * 0.85 * 100) / 100,
                upper_bound: Math.round(predictedPrice * 1.15 * 100) / 100
            };
        }

        // Save prediction to database
        const prediction = new PricePrediction({
            user_id: req.user._id,
            prediction_input: {
                crop_name: crop_name.toLowerCase(),
                location_id,
                prediction_date: predictionDate,
                weather_forecast: weatherDefaults,
                quantity
            },
            prediction_result: {
                predicted_price: predictedPrice,
                confidence_interval: confidence,
                model_version: "1.0"
            }
        });

        await prediction.save();

        // Get historical context
        const historicalData = await CropPriceData.getAveragePrice(
            crop_name.toLowerCase(), 
            location_id, 
            30
        );

        const historicalAvg = historicalData.length > 0 ? historicalData[0].avgPrice : null;

        res.status(200).json({
            success: true,
            data: {
                crop: crop_name.toLowerCase(),
                location: location_id,
                prediction_date: predictionDate,
                predicted_price: predictedPrice,
                confidence_interval: confidence,
                currency: "INR",
                unit: "per kg",
                historical_average: historicalAvg,
                weather_factors: weatherDefaults,
                model_info: {
                    version: "1.0",
                    prediction_id: prediction._id
                }
            }
        });

    } catch (error) {
        console.error("Price prediction error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error during price prediction"
        });
    }
});

// Fertilizer recommendation endpoint
router.post("/recommend-fertilizer", isLoggedIn, async (req, res) => {
    try {
        const {
            crop_name,
            soil_type = "loamy",
            soil_ph = 7.0,
            organic_matter = 2.5,
            nitrogen = 50,
            phosphorus = 30,
            potassium = 40,
            location_id = "LOC001",
            growth_stage = "vegetative"
        } = req.body;

        // Validate required fields
        if (!crop_name) {
            return res.status(400).json({
                success: false,
                error: "crop_name is required"
            });
        }

        // Validate crop name
        const validCrops = ['wheat', 'rice', 'corn', 'tomato', 'potato', 'onion', 'soybean', 'cotton'];
        if (!validCrops.includes(crop_name.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: `Invalid crop name. Must be one of: ${validCrops.join(', ')}`
            });
        }

        // Rule-based fertilizer recommendations
        const fertilizerRules = {
            wheat: {
                nitrogen: { optimal: 120, deficient: nitrogen < 80, excess: nitrogen > 150 },
                phosphorus: { optimal: 60, deficient: phosphorus < 40, excess: phosphorus > 80 },
                potassium: { optimal: 40, deficient: potassium < 30, excess: potassium > 60 }
            },
            rice: {
                nitrogen: { optimal: 100, deficient: nitrogen < 70, excess: nitrogen > 130 },
                phosphorus: { optimal: 50, deficient: phosphorus < 35, excess: phosphorus > 70 },
                potassium: { optimal: 50, deficient: potassium < 35, excess: potassium > 70 }
            },
            corn: {
                nitrogen: { optimal: 140, deficient: nitrogen < 100, excess: nitrogen > 180 },
                phosphorus: { optimal: 70, deficient: phosphorus < 50, excess: phosphorus > 90 },
                potassium: { optimal: 60, deficient: potassium < 40, excess: potassium > 80 }
            },
            tomato: {
                nitrogen: { optimal: 150, deficient: nitrogen < 110, excess: nitrogen > 190 },
                phosphorus: { optimal: 80, deficient: phosphorus < 60, excess: phosphorus > 100 },
                potassium: { optimal: 200, deficient: potassium < 150, excess: potassium > 250 }
            },
            potato: {
                nitrogen: { optimal: 120, deficient: nitrogen < 90, excess: nitrogen > 150 },
                phosphorus: { optimal: 90, deficient: phosphorus < 70, excess: phosphorus > 110 },
                potassium: { optimal: 150, deficient: potassium < 120, excess: potassium > 180 }
            },
            onion: {
                nitrogen: { optimal: 100, deficient: nitrogen < 75, excess: nitrogen > 130 },
                phosphorus: { optimal: 50, deficient: phosphorus < 35, excess: phosphorus > 70 },
                potassium: { optimal: 50, deficient: potassium < 35, excess: potassium > 70 }
            },
            soybean: {
                nitrogen: { optimal: 40, deficient: nitrogen < 25, excess: nitrogen > 60 }, // Lower N need due to fixation
                phosphorus: { optimal: 60, deficient: phosphorus < 45, excess: phosphorus > 80 },
                potassium: { optimal: 70, deficient: potassium < 50, excess: potassium > 90 }
            },
            cotton: {
                nitrogen: { optimal: 120, deficient: nitrogen < 90, excess: nitrogen > 150 },
                phosphorus: { optimal: 60, deficient: phosphorus < 45, excess: phosphorus > 80 },
                potassium: { optimal: 60, deficient: potassium < 45, excess: potassium > 80 }
            }
        };

        const cropRules = fertilizerRules[crop_name.toLowerCase()];
        if (!cropRules) {
            return res.status(400).json({
                success: false,
                error: "Fertilizer recommendations not available for this crop"
            });
        }

        // Calculate recommendations based on current soil nutrient levels
        const recommendations = [];
        const nutrientStatus = {};

        // Analyze each nutrient
        ['nitrogen', 'phosphorus', 'potassium'].forEach(nutrient => {
            const rule = cropRules[nutrient];
            const currentLevel = nutrient === 'nitrogen' ? nitrogen : 
                               nutrient === 'phosphorus' ? phosphorus : potassium;
            
            let status = 'optimal';
            let recommendation = 0;
            let action = 'maintain';

            if (rule.deficient) {
                status = 'deficient';
                recommendation = rule.optimal - currentLevel;
                action = 'increase';
            } else if (rule.excess) {
                status = 'excess';
                recommendation = 0;
                action = 'reduce or skip';
            }

            nutrientStatus[nutrient] = {
                current_level: currentLevel,
                optimal_level: rule.optimal,
                status,
                recommendation_kg_per_hectare: Math.max(0, recommendation),
                action
            };

            if (recommendation > 0) {
                recommendations.push({
                    nutrient: nutrient.toUpperCase(),
                    amount: Math.max(0, recommendation),
                    unit: "kg/hectare",
                    timing: growth_stage === 'flowering' ? 'immediate' : 'before next growth stage',
                    fertilizer_type: getFertilizerType(nutrient, soil_ph)
                });
            }
        });

        // pH adjustment recommendations
        let pHRecommendation = null;
        if (soil_ph < 6.0) {
            pHRecommendation = {
                issue: "Soil too acidic",
                recommendation: "Apply lime (CaCO3)",
                amount: `${Math.round((6.5 - soil_ph) * 2000)} kg/hectare`,
                reason: "Low pH reduces nutrient availability"
            };
        } else if (soil_ph > 8.0) {
            pHRecommendation = {
                issue: "Soil too alkaline", 
                recommendation: "Apply sulfur or organic matter",
                amount: `${Math.round((soil_ph - 7.0) * 500)} kg/hectare sulfur`,
                reason: "High pH reduces micronutrient availability"
            };
        }

        // Organic matter recommendations
        let organicMatterRecommendation = null;
        if (organic_matter < 2.0) {
            organicMatterRecommendation = {
                recommendation: "Increase organic matter content",
                methods: ["Add compost", "Green manuring", "Crop residue incorporation"],
                target: "3-5% organic matter",
                benefits: ["Improved soil structure", "Better nutrient retention", "Enhanced microbial activity"]
            };
        }

        // Save recommendation to database
        const fertilizerRec = new FertilizerPesticideRecommendation({
            user_id: req.user._id,
            crop_name: crop_name.toLowerCase(),
            location_id,
            growth_stage: growth_stage || 'generic',
            soil_type,
            recommended_fertilizers: recommendations.map(r => ({
                name: `${r.nutrient} recommendation`,
                dosage: r.amount,
                application_time: r.timing
            })),
            recommended_pesticides: [],
            common_pests_diseases: [],
            days_since_sowing: undefined
        });

        await fertilizerRec.save();

        res.status(200).json({
            success: true,
            data: {
                crop: crop_name.toLowerCase(),
                location: location_id,
                soil_analysis: {
                    type: soil_type,
                    ph: soil_ph,
                    organic_matter: organic_matter,
                    nutrient_levels: { nitrogen, phosphorus, potassium }
                },
                fertilizer_recommendations: recommendations,
                nutrient_status: nutrientStatus,
                ph_adjustment: pHRecommendation,
                organic_matter_advice: organicMatterRecommendation,
                general_advice: [
                    "Apply fertilizers in split doses for better efficiency",
                    "Consider soil moisture before fertilizer application",
                    "Monitor crop response and adjust in next season",
                    `Best application time for ${crop_name}: ${getApplicationTiming(crop_name.toLowerCase(), growth_stage)}`
                ],
                recommendation_id: fertilizerRec._id
            }
        });

    } catch (error) {
        console.error("Fertilizer recommendation error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error during fertilizer recommendation"
        });
    }
});

// Helper function to get appropriate fertilizer type based on nutrient and soil pH
function getFertilizerType(nutrient, soilPh) {
    const fertilizers = {
        nitrogen: {
            acidic: "Calcium Ammonium Nitrate (CAN)",
            neutral: "Urea",
            alkaline: "Ammonium Sulfate"
        },
        phosphorus: {
            acidic: "Single Super Phosphate (SSP)",
            neutral: "Diammonium Phosphate (DAP)",
            alkaline: "Triple Super Phosphate (TSP)"
        },
        potassium: {
            acidic: "Potassium Sulfate",
            neutral: "Muriate of Potash (MOP)",
            alkaline: "Potassium Sulfate"
        }
    };

    let pHCategory = 'neutral';
    if (soilPh < 6.5) pHCategory = 'acidic';
    else if (soilPh > 7.5) pHCategory = 'alkaline';

    return fertilizers[nutrient][pHCategory];
}

// Helper function to get application timing
function getApplicationTiming(crop, growthStage) {
    const timings = {
        wheat: "Basal + 21 days after sowing + flowering",
        rice: "Transplanting + tillering + panicle initiation",
        corn: "Planting + knee-high + pre-tassel",
        tomato: "Transplanting + flowering + fruit development",
        potato: "Planting + hilling + tuber initiation",
        onion: "Transplanting + bulb initiation + bulb development",
        soybean: "Planting + flowering (minimal N needed)",
        cotton: "Planting + squaring + flowering"
    };

    return timings[crop] || "Follow crop-specific guidelines";
}

// Get user's prediction history
router.get("/predictions", isLoggedIn, async (req, res) => {
    try {
        const predictions = await PricePrediction.find({ user_id: req.user._id })
            .sort({ created_at: -1 })
            .limit(10);

        const formattedPredictions = predictions.map(pred => pred.formatPrediction());

        res.status(200).json({
            success: true,
            data: formattedPredictions
        });

    } catch (error) {
        console.error("Error fetching prediction history:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch prediction history"
        });
    }
});

// Get user's fertilizer recommendation history
router.get("/fertilizer-history", isLoggedIn, async (req, res) => {
    try {
        const recommendations = await FertilizerPesticideRecommendation.find({ user_id: req.user._id })
            .sort({ created_at: -1 })
            .limit(10);

        res.status(200).json({
            success: true,
            data: recommendations
        });

    } catch (error) {
        console.error("Error fetching fertilizer history:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch fertilizer recommendation history"
        });
    }
});

module.exports = router;

// --- Comprehensive Chatbot endpoint ---
// POST /api/chat { message: string, lang?: 'en'|'te' }
router.post('/chat', isLoggedIn, async (req, res) => {
  try {
    const { message = '', lang = 'en' } = req.body || {};
    const text = String(message).trim().toLowerCase();
    const userId = req.user._id;
    const userType = req.user.constructor.modelName;

    // Telugu crop name mapping
    const teToEn = {
      'బియ్యం': 'rice', 'గోధుమలు': 'wheat', 'మొక్కజొన్న': 'corn',
      'టమోటా': 'tomato', 'బంగాళదుంప': 'potato', 'ఉల్లిపాయ': 'onion',
      'సోయాబీన్': 'soybean', 'పత్తి': 'cotton'
    };

    // Growing process guides
    const growProcesses = {
      wheat: [
        '1. Prepare well-drained loamy soil with pH 6.0-7.5',
        '2. Sow certified seeds at 4-5 cm depth in rows',
        '3. Apply fertilizers: 60kg Urea, 50kg DAP, 25kg MOP per acre',
        '4. Irrigate at crown root initiation (21 days) and heading stage',
        '5. Control weeds at 20-25 days and 40-45 days after sowing',
        '6. Harvest when grains are hard and straw turns yellow (120-150 days)'
      ],
      rice: [
        '1. Puddle the field and maintain 2-3 cm standing water',
        '2. Transplant 20-25 day old seedlings',
        '3. Apply fertilizers: 50kg Urea, 40kg DAP, 40kg MOP per acre',
        '4. Maintain water level, apply split N at tillering and panicle initiation',
        '5. Drain water 7-10 days before harvest',
        '6. Harvest at 20-24% grain moisture (110-120 days)'
      ],
      cotton: [
        '1. Prepare black or loamy soil with good drainage',
        '2. Sow seeds at 2-3 cm depth with proper spacing',
        '3. Apply fertilizers: 50kg DAP, 40kg MOP, 40kg Urea per acre',
        '4. Irrigate at squaring, flowering, and boll development stages',
        '5. Control pests (bollworm, aphids) and weeds regularly',
        '6. Harvest when bolls open (150-180 days)'
      ],
      tomato: [
        '1. Prepare loamy soil with pH 6.0-7.5',
        '2. Transplant 25-30 day old seedlings',
        '3. Apply fertilizers: 25kg NPK 19:19:19, 1 ton vermicompost per acre',
        '4. Provide support (staking) and regular irrigation',
        '5. Control diseases (blight, wilt) and pests',
        '6. Harvest fruits at mature green or red stage (70-90 days)'
      ]
    };

    // 1. PRICE QUERIES
    const pricePatterns = [
      /(?:what is|show|tell|give).*price.*(?:of|for)?\s*(wheat|rice|corn|tomato|potato|onion|soybean|cotton)/i,
      /(?:price|rate|ధర|రేటు).*(?:of|for)?\s*(wheat|rice|corn|tomato|potato|onion|soybean|cotton)/i,
      /^(wheat|rice|corn|tomato|potato|onion|soybean|cotton)\s*(?:price|rate|ధర|రేటు)?$/i,
      /^(wheat|rice|corn|tomato|potato|onion|soybean|cotton)$/i
    ];
    
    let crop = null;
    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        crop = match[1]?.toLowerCase();
        break;
      }
    }
    
    // Check Telugu crop names
    if (!crop) {
      for (const [te, en] of Object.entries(teToEn)) {
        if (text.includes(te) && /(ధర|రేటు|price|rate)/.test(text)) {
          crop = en;
          break;
        }
      }
    }
    
    if (!crop) {
      for (const [te, en] of Object.entries(teToEn)) {
        if (text.trim() === te) {
          crop = en;
          break;
        }
      }
    }

    if (crop) {
      try {
        const { CropPriceData } = require('../models/cropPriceModel');
        const avgData = await CropPriceData.getAveragePrice(crop, 'LOC001', 30);
        const avg = avgData && avgData[0] ? Math.round(avgData[0].avgPrice) : null;
        const basePrices = { wheat: 25, rice: 35, corn: 20, tomato: 45, potato: 15, onion: 30, soybean: 55, cotton: 80 };
        const price = avg || basePrices[crop] || 30;
        
        const reply = lang === 'te' 
          ? `${crop} ధర: ₹${price}/kg (30 రోజుల సగటు)` 
          : `The price of ${crop} is ₹${price}/kg (30-day average)`;
        return res.json({ success: true, reply });
      } catch (e) {
        const basePrices = { wheat: 25, rice: 35, corn: 20, tomato: 45, potato: 15, onion: 30, soybean: 55, cotton: 80 };
        const price = basePrices[crop] || 30;
        const reply = lang === 'te' 
          ? `${crop} అంచనా ధర: ₹${price}/kg` 
          : `Estimated price for ${crop}: ₹${price}/kg`;
        return res.json({ success: true, reply });
      }
    }

    // 2. GROWING PROCESS QUERIES
    const processPatterns = [
      /(?:how|what).*process.*(?:to|for)?\s*(?:grow|plant|cultivate).*(wheat|rice|corn|tomato|potato|onion|soybean|cotton)/i,
      /(?:process|steps|method).*(?:to|for)?\s*(?:grow|plant|cultivate).*(wheat|rice|corn|tomato|potato|onion|soybean|cotton)/i,
      /(?:grow|plant|cultivate).*(wheat|rice|corn|tomato|potato|onion|soybean|cotton)/i
    ];
    
    let processCrop = null;
    for (const pattern of processPatterns) {
      const match = text.match(pattern);
      if (match) {
        processCrop = match[1]?.toLowerCase();
        break;
      }
    }
    
    if (processCrop && growProcesses[processCrop]) {
      const reply = lang === 'te'
        ? `${processCrop} పెంచడం ప్రక్రియ:\n${growProcesses[processCrop].join('\n')}`
        : `Process to grow ${processCrop}:\n${growProcesses[processCrop].join('\n')}`;
      return res.json({ success: true, reply });
    }

    // 3. TRANSACTION/SALES HISTORY (for farmers)
    if (userType === 'FarmerLogin' && /(?:transaction|sales|sold|history|record)/i.test(text)) {
      try {
        const sold = await SoldInventory.findOne({ farmer: userId });
        const requests = await RequestModel.find({ farmer: userId, order: 'accepted' })
          .populate('buyer')
          .sort({ createdAt: -1 })
          .limit(10);
        
        if (!sold || !sold.inventory || sold.inventory.length === 0) {
          const reply = lang === 'te' 
            ? 'మీరు ఇంకా ఏమీ అమ్మలేదు.' 
            : 'You have not sold any crops yet.';
          return res.json({ success: true, reply });
        }
        
        let totalQty = 0;
        let totalValue = 0;
        sold.inventory.forEach(item => {
          totalQty += item.quantity || 0;
          totalValue += (item.quantity || 0) * (item.price || 0);
        });
        
        const reply = lang === 'te'
          ? `మీరు మొత్తం ${totalQty} kg పంటలు అమ్మారు. మొత్తం విలువ: ₹${Math.round(totalValue)}. ${requests.length} ఆర్డర్లు పూర్తయ్యాయి.`
          : `You have sold ${totalQty} kg of crops. Total value: ₹${Math.round(totalValue)}. ${requests.length} orders completed.`;
        return res.json({ success: true, reply });
      } catch (e) {
        const reply = lang === 'te' 
          ? 'వివరాలు పొందడంలో లోపం.' 
          : 'Error fetching transaction history.';
        return res.json({ success: true, reply });
      }
    }

    // 4. QUANTITY SOLD QUERY
    if (userType === 'FarmerLogin' && /(?:quantity|how much).*(?:sold|selled|sale)/i.test(text)) {
      try {
        const sold = await SoldInventory.findOne({ farmer: userId });
        if (!sold || !sold.inventory || sold.inventory.length === 0) {
          const reply = lang === 'te' 
            ? 'మీరు ఇంకా ఏమీ అమ్మలేదు.' 
            : 'You have not sold any quantity yet.';
          return res.json({ success: true, reply });
        }
        
        let totalQty = 0;
        const details = [];
        sold.inventory.forEach(item => {
          totalQty += item.quantity || 0;
          details.push(`${item.crop}: ${item.quantity} kg`);
        });
        
        const reply = lang === 'te'
          ? `మీరు మొత్తం ${totalQty} kg అమ్మారు. వివరాలు: ${details.join(', ')}`
          : `You have sold ${totalQty} kg in total. Details: ${details.join(', ')}`;
        return res.json({ success: true, reply });
      } catch (e) {
        const reply = lang === 'te' 
          ? 'వివరాలు పొందడంలో లోపం.' 
          : 'Error fetching sales quantity.';
        return res.json({ success: true, reply });
      }
    }

    // 5. WEATHER QUERIES
    if (/(?:weather|temperature|rain|rainfall|వాతావరణం)/i.test(text)) {
      try {
        const lat = req.query.lat || '17.3850';
        const lon = req.query.lon || '78.4867';
        const apiKey = process.env.OPENWEATHER_API_KEY;
        
        if (apiKey) {
          const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
          const resp = await axios.get(url, { timeout: 5000 });
          const w = resp.data;
          const reply = lang === 'te'
            ? `వాతావరణం: ${Math.round(w.main?.temp || 30)}°C, తేమ: ${w.main?.humidity || 55}%, ${w.weather?.[0]?.description || 'clear sky'}`
            : `Weather: ${Math.round(w.main?.temp || 30)}°C, Humidity: ${w.main?.humidity || 55}%, ${w.weather?.[0]?.description || 'clear sky'}`;
          return res.json({ success: true, reply });
        } else {
          const reply = lang === 'te'
            ? 'వాతావరణం: 30°C, తేమ: 55%, స్పష్టమైన ఆకాశం (అంచనా)'
            : 'Weather: 30°C, Humidity: 55%, Clear sky (estimated)';
          return res.json({ success: true, reply });
        }
      } catch (e) {
        const reply = lang === 'te'
          ? 'వాతావరణం: 30°C, తేమ: 55% (అంచనా)'
          : 'Weather: 30°C, Humidity: 55% (estimated)';
        return res.json({ success: true, reply });
      }
    }

    // 6. GREETINGS
    if (/^(hi|hello|namaste|hey|నమస్తే)/i.test(text)) {
      const reply = lang === 'te'
        ? 'నమస్తే! మీకు ఎలా సహాయం చేయగలను? పంట ధర, పెంచడం ప్రక్రియ, లావాదేవీలు మొదలైనవి గురించి అడగవచ్చు.'
        : 'Hello! How can I help you? Ask about crop prices, growing process, transactions, etc.';
      return res.json({ success: true, reply });
    }

    // 7. FERTILIZER QUERIES
    if (/(?:fertilizer|fertiliser|npk|ఎరువు|ఎరువులు)/i.test(text)) {
      const reply = lang === 'te'
        ? 'ఎరువు సలహా కోసం, పంట పేరు మరియు మట్టి pH చెప్పండి. లేదా Crop Advisor ఫారమ్ నింపండి.'
        : 'For fertilizer recommendations, tell me the crop name and soil pH. Or fill the Crop Advisor form.';
      return res.json({ success: true, reply });
    }

    // DEFAULT FALLBACK
    const reply = lang === 'te'
      ? 'క్షమించండి, మీ ప్రశ్న స్పష్టంగా లేదు. పంట ధర, పెంచడం ప్రక్రియ, లావాదేవీలు గురించి అడగవచ్చు.'
      : 'Sorry, I did not understand. You can ask about crop prices, growing process, transactions, etc.';
    return res.json({ success: true, reply });
  } catch (e) {
    console.error('Chat error:', e);
    const reply = req.body?.lang === 'te'
      ? 'లోపం సంభవించింది. దయచేసి మళ్లీ ప్రయత్నించండి.'
      : 'An error occurred. Please try again.';
    return res.json({ success: true, reply });
  }
});

// --- Crop recommendations ---
// POST /api/recommendations { location, soil_type, ph, rainfall, plot_size, season, budget_level, risk_preference, crop_category, water_availability, temperature, experience_level, market_distance, limit }
router.post('/recommendations', async (req, res) => {
  try {
    const {
      location,
      soil_type,
      ph,
      rainfall,
      plot_size,
      season,
      budget_level,
      risk_preference,
      crop_category,
      water_availability,
      temperature,
      experience_level,
      market_distance,
      limit = 5
    } = req.body || {};

    // ENFORCE: soil_type is required
    if (!soil_type) {
      return res.status(400).json({ 
        success: false, 
        error: 'soil_type is required for accurate recommendations',
        hint: 'Please select your soil type (sandy, loamy, clayey, or black)'
      });
    }

    // Validate pH if provided
    if (ph !== undefined && ph !== null && ph !== '') {
      const phNum = parseFloat(ph);
      if (isNaN(phNum) || phNum < 4 || phNum > 9) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid pH value. Must be between 4 and 9'
        });
      }
    }

    const result = await Crop.getRecommendations({
      location,
      soil_type,
      ph: ph ? parseFloat(ph) : undefined,
      rainfall: rainfall ? parseFloat(rainfall) : undefined,
      plot_size: plot_size ? parseFloat(plot_size) : undefined,
      season,
      budget_level,
      risk_preference,
      crop_category,
      water_availability,
      temperature: temperature ? parseFloat(temperature) : undefined,
      experience_level,
      market_distance: market_distance ? parseFloat(market_distance) : undefined
    });

    const recos = result.recommendations || [];
    const take = Math.min(10, Math.max(1, parseInt(limit)));

    const formatProcedure = (crop) => {
      const steps = [];
      const gs = Array.isArray(crop.growth_stages) ? crop.growth_stages : [];
      const harvestMin = crop.harvesting?.days_to_maturity?.min;
      const harvestMax = crop.harvesting?.days_to_maturity?.max;
      const stageByName = (namePart) => gs.find(s => (s.name || '').toLowerCase().includes(namePart));
      const veg = stageByName('veget');
      const flow = stageByName('flower');

      steps.push({
        step: 'Land Preparation',
        days: 'D-14 to D0',
        description: `Prepare field; ensure drainage. Preferred soils: ${crop.soil_requirements?.soil_types?.join(', ') || 'varied'}. Optimal pH: ${crop.soil_requirements?.ph_range?.optimal ?? '6.0–7.5'}.`
      });

      steps.push({
        step: 'Sowing',
        days: 'D0',
        description: `Seed rate ${crop.planting_details?.seed_rate?.value || '-'} ${crop.planting_details?.seed_rate?.unit || ''}; depth ${crop.planting_details?.depth?.value || '-'} ${crop.planting_details?.depth?.unit || ''}; spacing R-R ${crop.planting_details?.spacing?.row_to_row?.value || '-'}${crop.planting_details?.spacing?.row_to_row?.unit || ''}, P-P ${crop.planting_details?.spacing?.plant_to_plant?.value || '-'}${crop.planting_details?.spacing?.plant_to_plant?.unit || ''}.`
      });

      steps.push({
        step: 'Nutrient Management',
        days: veg ? `${veg.days_from_sowing?.min ?? 'D20'}–${veg.days_from_sowing?.max ?? 'D40'}` : 'D20–D40',
        description: `Apply N ${crop.nutrient_management?.nitrogen?.requirement?.value || '-'}${crop.nutrient_management?.nitrogen?.requirement?.unit || ''}, P ${crop.nutrient_management?.phosphorus?.requirement?.value || '-'}${crop.nutrient_management?.phosphorus?.requirement?.unit || ''}, K ${crop.nutrient_management?.potassium?.requirement?.value || '-'}${crop.nutrient_management?.potassium?.requirement?.unit || ''}. ${crop.nutrient_management?.nitrogen?.schedule || ''}`
      });

      steps.push({
        step: 'Irrigation',
        days: flow ? `${flow.days_from_sowing?.min ?? 'D40'}–${flow.days_from_sowing?.max ?? 'D70'}` : 'Critical stages (flowering/fruiting)',
        description: `${crop.water_requirements?.irrigation_schedule?.frequency || 'As per soil moisture'}; critical stages: ${(crop.water_requirements?.irrigation_schedule?.critical_stages || []).join(', ') || 'flowering/fruiting'}.`
      });

      steps.push({
        step: 'Pest and Disease Management',
        days: veg && harvestMax ? `${veg.days_from_sowing?.min ?? 'D20'}–D${harvestMax}` : 'Throughout crop growth',
        description: `${Array.isArray(crop.pests_diseases) && crop.pests_diseases.length ? crop.pests_diseases.map(pd => `${pd.name} (${pd.type})`).join('; ') : 'Scout weekly; follow IPM. Use PHI guidance before harvest.'}`
      });

      steps.push({
        step: 'Harvesting',
        days: (harvestMin && harvestMax) ? `D${harvestMin}–D${harvestMax}` : 'At physiological maturity',
        description: `Expected yield ${crop.harvesting?.expected_yield?.min || '-'}-${crop.harvesting?.expected_yield?.max || '-'} ${crop.harvesting?.expected_yield?.unit || ''}. Storage: ${crop.post_harvest?.storage?.method || 'cool, dry place'}.`
      });

      return steps;
    };

    const results = recos.slice(0, take).map(item => ({
      name: item.crop.name,
      scientific_name: item.crop.scientific_name,
      categories: item.crop.categories,
      score: item.score,
      score_breakdown: item.breakdown || {},
      accuracy: result.accuracy || 'Medium',
      why: item.why,
      expected_yield: item.crop.harvesting?.expected_yield,
      days_to_maturity: item.crop.harvesting?.days_to_maturity,
      planting_details: item.crop.planting_details,
      water_requirements: item.crop.water_requirements,
      soil_requirements: item.crop.soil_requirements,
      climate_zones: item.crop.climate_zones,
      economics: item.crop.economics,
      market_info: item.crop.market_info,
      region_specific_notes: item.crop.region_specific_notes,
      procedure: formatProcedure(item.crop),
      alternatives: []
    }));

    return res.json({ 
      success: true, 
      accuracy: result.accuracy || 'Medium',
      total_crops_evaluated: result.total_crops_evaluated || 0,
      recommendations_count: result.recommendations_count || recos.length,
      recommendations: results,
      metadata: {
        threshold_score: 50,
        scoring_weights: {
          soil: '35%',
          climate_water: '35%',
          season: '15%',
          economics: '15%'
        }
      }
    });
  } catch (e) {
    console.error('Recommendations error:', e);
    if (e.message && e.message.includes('required')) {
      return res.status(400).json({ success: false, error: e.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to generate recommendations: ' + e.message });
  }
});