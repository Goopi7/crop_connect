const mongoose = require("mongoose");
const { Schema } = mongoose;

const recommendationItemSchema = new Schema({
    name: String,
    npk_ratio: String,
    dosage: String,
    application_time: String,
    target_pest: String,
    safety_waiting_period: String
}, { _id: false });

const fertilizerPesticideRecommendationSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "FarmerLogin",
        index: true
    },
    crop_id: {
        type: Schema.Types.ObjectId,
        ref: "Crop",
        index: true
    },
    crop_name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    location_id: {
        type: String,
        index: true
    },
    growth_stage: {
        type: String,
        required: true,
        trim: true,
        enum: ['seedling', 'vegetative', 'flowering', 'fruiting', 'pre-harvest', 'post-harvest', 'generic']
    },
    days_since_sowing: Number,
    soil_type: String,
    common_pests_diseases: [String],
    recommended_fertilizers: [recommendationItemSchema],
    recommended_pesticides: [recommendationItemSchema],
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

fertilizerPesticideRecommendationSchema.pre("save", function(next) {
    this.updated_at = Date.now();
    next();
});

const FertilizerPesticideRecommendation = mongoose.model(
    "FertilizerPesticideRecommendation",
    fertilizerPesticideRecommendationSchema
);

module.exports = FertilizerPesticideRecommendation;

