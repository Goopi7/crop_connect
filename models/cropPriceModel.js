const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Historical crop price data schema
const cropPriceDataSchema = new Schema({
    date: {
        type: Date,
        required: true,
        index: true
    },
    location_id: {
        type: String,
        required: true,
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
    price: {
        type: Number,
        required: true,
        min: 0
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    weather_features: {
        temperature: {
            type: Number,
            required: true
        },
        humidity: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        rainfall: {
            type: Number,
            required: true,
            min: 0
        },
        wind_speed: {
            type: Number,
            required: true,
            min: 0
        },
        sunshine_hours: {
            type: Number,
            required: true,
            min: 0,
            max: 24
        }
    },
    market_factors: {
        season: {
            type: Number,
            min: 0,
            max: 1
        },
        demand_factor: {
            type: Number,
            min: 0
        }
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

// Price prediction request schema
const pricePredictionSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "FarmerLogin",
        required: true
    },
    prediction_input: {
        crop_id: {
            type: Schema.Types.ObjectId,
            ref: "Crop"
        },
        crop_name: {
            type: String,
            required: true,
            trim: true
        },
        location_id: {
            type: String,
            required: true
        },
        prediction_date: {
            type: Date,
            required: true
        },
        weather_forecast: {
            temperature: Number,
            humidity: Number,
            rainfall: Number,
            wind_speed: Number,
            sunshine_hours: Number
        },
        quantity: {
            type: Number,
            required: true,
            min: 0
        }
    },
    prediction_result: {
        predicted_price: {
            type: Number,
            required: true
        },
        confidence_interval: {
            lower_bound: Number,
            upper_bound: Number
        },
        recommended_planning_start_date: Date,
        recommended_sale_window_start: Date,
        recommended_sale_window_end: Date,
        model_version: {
            type: String,
            default: "1.0"
        }
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Compound indexes for better query performance
cropPriceDataSchema.index({ crop_id: 1, crop_name: 1, location_id: 1, date: -1 });
cropPriceDataSchema.index({ date: -1, crop_name: 1 });
pricePredictionSchema.index({ user_id: 1, created_at: -1 });

// Pre-save middleware to update the updated_at field
cropPriceDataSchema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
});

// Static method to get price trends for a specific crop
cropPriceDataSchema.statics.getPriceTrends = function({ cropId, cropName, locationId, days = 30 }) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const match = {
        location_id: locationId,
        date: { $gte: startDate }
    };
    if (cropId) match.crop_id = cropId;
    if (cropName) match.crop_name = cropName;

    return this.find(match).sort({ date: 1 });
};

// Static method to get average price for a crop in a location
cropPriceDataSchema.statics.getAveragePrice = function({ cropId, cropName, locationId, days = 30 }) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        {
            $match: {
                ...(cropId ? { crop_id: cropId } : {}),
                ...(cropName ? { crop_name: cropName } : {}),
                location_id: locationId,
                date: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: null,
                avgPrice: { $avg: "$price" },
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" },
                count: { $sum: 1 }
            }
        }
    ]);
};

// Instance method to format prediction output
pricePredictionSchema.methods.formatPrediction = function() {
    return {
        crop: this.prediction_input.crop_name,
        location: this.prediction_input.location_id,
        prediction_date: this.prediction_input.prediction_date,
        predicted_price: this.prediction_result.predicted_price,
        confidence: this.prediction_result.confidence_interval,
        recommended_planning_start_date: this.prediction_result.recommended_planning_start_date,
        recommended_sale_window_start: this.prediction_result.recommended_sale_window_start,
        recommended_sale_window_end: this.prediction_result.recommended_sale_window_end,
        created: this.created_at
    };
};

const CropPriceData = mongoose.model("CropPriceData", cropPriceDataSchema);
const PricePrediction = mongoose.model("PricePrediction", pricePredictionSchema);

module.exports = {
    CropPriceData,
    PricePrediction
};