const { predictCropPrice } = require("../services/predictionService");
const { generateRecommendations } = require("../services/agronomyRecommendationService");

async function predictPriceHandler(req, res) {
    try {
        const {
            crop_id,
            crop_name,
            location_id,
            prediction_date,
            weather_forecast,
            quantity,
            growth_stage,
            days_since_sowing,
            soil_type
        } = req.body;
        const userId = req.user?._id || req.body.user_id;

        const prediction = await predictCropPrice({
            userId,
            cropId: crop_id,
            cropName: crop_name,
            locationId: location_id,
            predictionDate: prediction_date,
            weatherForecast: weather_forecast,
            quantity
        });

        const recommendationResult = await generateRecommendations({
            cropId: crop_id,
            cropName: crop_name,
            locationId: location_id,
            growthStage: growth_stage || "generic",
            daysSinceSowing: days_since_sowing,
            soilType: soil_type
        });

        return res.json({
            prediction: prediction.formatPrediction(),
            agronomy: recommendationResult
        });
    } catch (err) {
        console.error("prediction error", err);
        return res.status(500).json({ message: err.message || "prediction failed" });
    }
}

module.exports = {
    predictPriceHandler
};

