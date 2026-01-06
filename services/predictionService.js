const { CropPriceData, PricePrediction } = require("../models/cropPriceModel");
const Crop = require("../models/cropModel");
const FertilizerPesticideRecommendation = require("../models/fertilizerPesticideRecommendation");

async function fetchHistoricalWindow({ cropId, cropName, locationId, days = 90 }) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const match = {
        location_id: locationId,
        date: { $gte: startDate }
    };
    if (cropId) match.crop_id = cropId;
    if (cropName) match.crop_name = cropName;

    const docs = await CropPriceData.find(match).sort({ date: 1 }).lean();
    return docs;
}

function simpleConfidenceInterval(values) {
    if (!values.length) return { lower: null, upper: null, margin: null };
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    const margin = 1.96 * (std / Math.sqrt(values.length || 1));
    return {
        lower: Math.max(0, mean - margin),
        upper: mean + margin,
        margin
    };
}

function derivePlanningWindows(cropDoc, predictionDate) {
    const days = cropDoc?.default_growth_cycle_days || 90;
    const planningStart = new Date(predictionDate);
    planningStart.setDate(planningStart.getDate() - Math.min(45, Math.round(days * 0.5)));

    const saleStart = new Date(predictionDate);
    saleStart.setDate(saleStart.getDate() - 7);
    const saleEnd = new Date(predictionDate);
    saleEnd.setDate(saleEnd.getDate() + 7);

    return {
        recommended_planning_start_date: planningStart,
        recommended_sale_window_start: saleStart,
        recommended_sale_window_end: saleEnd
    };
}

async function predictCropPrice({ userId, cropId, cropName, locationId, predictionDate, weatherForecast = {}, quantity = 0, historyDays = 90 }) {
    const cropDoc = cropId ? await Crop.findById(cropId).lean() : await Crop.findOne({ name: cropName }).lean();
    const history = await fetchHistoricalWindow({ cropId: cropDoc?._id || cropId, cropName: cropDoc?.name || cropName, locationId, days: historyDays });

    const prices = history.map(h => h.price);
    let predicted = prices.length ? prices[prices.length - 1] : 0;

    if (prices.length) {
        const window = prices.slice(-Math.min(30, prices.length));
        predicted = window.reduce((s, v) => s + v, 0) / window.length;
    } else {
        predicted = 0;
    }

    // Simple quantity adjustment (placeholder)
    if (quantity > 0) {
        predicted = predicted * (1 - Math.min(0.1, (quantity / 10000)));
    }

    const ci = simpleConfidenceInterval(prices);
    const windows = derivePlanningWindows(cropDoc, predictionDate);

    const prediction = await PricePrediction.create({
        user_id: userId,
        prediction_input: {
            crop_id: cropDoc?._id || cropId,
            crop_name: cropDoc?.name || cropName,
            location_id: locationId,
            prediction_date: predictionDate,
            weather_forecast: weatherForecast,
            quantity
        },
        prediction_result: {
            predicted_price: predicted,
            confidence_interval: {
                lower_bound: ci.lower,
                upper_bound: ci.upper
            },
            model_version: "1.0-baseline",
            recommended_planning_start_date: windows.recommended_planning_start_date,
            recommended_sale_window_start: windows.recommended_sale_window_start,
            recommended_sale_window_end: windows.recommended_sale_window_end
        }
    });

    return prediction;
}

async function getFertilizerPesticideRecommendations({ cropId, cropName, locationId, growthStage = "generic", daysSinceSowing, soilType }) {
    const match = {
        growth_stage: growthStage
    };
    if (cropId) match.crop_id = cropId;
    if (cropName) match.crop_name = cropName;
    if (locationId) match.location_id = locationId;
    if (soilType) match.soil_type = soilType;

    const rec = await FertilizerPesticideRecommendation.find(match).lean();
    return rec;
}

module.exports = {
    fetchHistoricalWindow,
    predictCropPrice,
    getFertilizerPesticideRecommendations
};

