const FertilizerPesticideRecommendation = require("../models/fertilizerPesticideRecommendation");
const Crop = require("../models/cropModel");

function fallbackRecommendations({ cropName, growthStage }) {
    const defaults = {
        seedling: {
            fertilizers: [{ name: "Urea", npk_ratio: "46-0-0", dosage: "20-30 kg/acre", application_time: "Basal" }],
            pesticides: [{ name: "Neem oil", target_pest: "general sucking pests", dosage: "2-3 ml/L", application_time: "After emergence", safety_waiting_period: "3-5 days" }]
        },
        vegetative: {
            fertilizers: [{ name: "DAP", npk_ratio: "18-46-0", dosage: "40-50 kg/acre", application_time: "Top dressing" }],
            pesticides: [{ name: "Chlorantraniliprole", target_pest: "borers", dosage: "as per label", application_time: "On incidence", safety_waiting_period: "7-14 days" }]
        },
        flowering: {
            fertilizers: [{ name: "MOP", npk_ratio: "0-0-60", dosage: "20-30 kg/acre", application_time: "Early flowering" }],
            pesticides: [{ name: "Emamectin benzoate", target_pest: "caterpillars", dosage: "as per label", application_time: "Early infestation", safety_waiting_period: "7 days" }]
        },
        fruiting: {
            fertilizers: [{ name: "NPK 13:0:45", npk_ratio: "13-0-45", dosage: "5-8 kg/acre", application_time: "Foliar, weekly" }],
            pesticides: [{ name: "Spinosad", target_pest: "thrips", dosage: "as per label", application_time: "On incidence", safety_waiting_period: "3 days" }]
        },
        "pre-harvest": {
            fertilizers: [{ name: "No heavy nitrogen", npk_ratio: "-", dosage: "Avoid", application_time: "Pre-harvest" }],
            pesticides: [{ name: "Avoid chemicals", target_pest: "—", dosage: "—", application_time: "—", safety_waiting_period: "—" }]
        }
    };

    const stage = defaults[growthStage] || defaults.seedling;
    return {
        crop_name: cropName,
        growth_stage: growthStage,
        recommended_fertilizers: stage.fertilizers,
        recommended_pesticides: stage.pesticides,
        confidence: "low",
        source: "fallback"
    };
}

async function generateRecommendations({ cropId, cropName, locationId, growthStage = "generic", daysSinceSowing, soilType }) {
    const stage = (growthStage || "generic").toLowerCase();

    // 1) Exact matches by crop + location + stage
    const exact = await FertilizerPesticideRecommendation.find({
        ...(cropId ? { crop_id: cropId } : {}),
        ...(cropName ? { crop_name: cropName } : {}),
        ...(locationId ? { location_id: locationId } : {}),
        growth_stage: stage
    }).lean();
    if (exact.length) return { recommendations: exact, confidence: "high", source: "database-exact" };

    // 2) Fallback to generic stage for the same crop/location
    const generic = await FertilizerPesticideRecommendation.find({
        ...(cropId ? { crop_id: cropId } : {}),
        ...(cropName ? { crop_name: cropName } : {}),
        ...(locationId ? { location_id: locationId } : {}),
        growth_stage: "generic"
    }).lean();
    if (generic.length) return { recommendations: generic, confidence: "medium", source: "database-generic" };

    // 3) Fallback to crop only (ignore location) with stage
    const cropStage = await FertilizerPesticideRecommendation.find({
        ...(cropId ? { crop_id: cropId } : {}),
        ...(cropName ? { crop_name: cropName } : {}),
        growth_stage: stage
    }).lean();
    if (cropStage.length) return { recommendations: cropStage, confidence: "medium", source: "database-crop-stage" };

    // 4) Category-based fallback (OR by id or name)
    const crop = await Crop.findOne(
        cropId ? { _id: cropId } : { name: cropName }
    ).lean();
    if (crop?.categories?.length) {
        const categoryRec = await FertilizerPesticideRecommendation.findOne({
            crop_name: { $in: crop.categories },
            growth_stage: { $in: [stage, "generic"] }
        }).lean();
        if (categoryRec) return { recommendations: [categoryRec], confidence: "medium", source: "category-fallback" };
    }

    // 5) Rule fallback
    return { recommendations: [fallbackRecommendations({ cropName, growthStage: stage })], confidence: "low", source: "rule-fallback" };
}

module.exports = {
    generateRecommendations
};

