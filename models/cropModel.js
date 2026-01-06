const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Pest/Disease Profile Schema
const pestDiseaseSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['pest', 'disease', 'weed'],
        required: true
    },
    symptoms: {
        type: String,
        required: true
    },
    threshold: {
        type: String,
        required: true
    },
    treatments: [{
        name: String,
        method: String,
        dosage: String,
        frequency: String,
        organic: Boolean
    }],
    preventive_measures: [String]
});

// Growth Stage Schema
const growthStageSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    days_from_sowing: {
        min: Number,
        max: Number
    },
    description: String,
    key_activities: [String],
    irrigation_needs: {
        frequency: String,
        amount: String
    },
    nutrient_requirements: {
        nitrogen: {
            amount: String,
            application_method: String
        },
        phosphorus: {
            amount: String,
            application_method: String
        },
        potassium: {
            amount: String,
            application_method: String
        },
        other: [{
            nutrient: String,
            amount: String,
            application_method: String
        }]
    }
});

// Climate Zone Schema
const climateZoneSchema = new Schema({
    zone_name: {
        type: String,
        required: true,
        trim: true
    },
    sowing_window: {
        start_month: Number,
        end_month: Number
    },
    temperature_range: {
        min: Number,
        max: Number,
        unit: {
            type: String,
            default: 'celsius'
        }
    },
    rainfall_requirement: {
        min: Number,
        max: Number,
        unit: {
            type: String,
            default: 'mm'
        }
    },
    humidity_range: {
        min: Number,
        max: Number
    }
});

// Comprehensive Crop Schema
const cropSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    scientific_name: {
        type: String,
        trim: true
    },
    categories: [{
        type: String,
        trim: true
    }],
    default_growth_cycle_days: {
        type: Number,
        min: 0
    },
    typical_season_months: [{
        type: Number,
        min: 1,
        max: 12
    }],
    description: {
        type: String,
        required: true
    },
    climate_zones: [climateZoneSchema],
    soil_requirements: {
        soil_types: [{
            type: String,
            trim: true
        }],
        ph_range: {
            min: {
                type: Number,
                min: 0,
                max: 14
            },
            max: {
                type: Number,
                min: 0,
                max: 14
            },
            optimal: {
                type: Number,
                min: 0,
                max: 14
            }
        },
        drainage: {
            type: String,
            enum: ['poor', 'moderate', 'good', 'excellent']
        }
    },
    water_requirements: {
        annual_rainfall: {
            min: Number,
            max: Number,
            unit: {
                type: String,
                default: 'mm'
            }
        },
        irrigation_schedule: {
            frequency: String,
            critical_stages: [String]
        },
        drought_tolerance: {
            type: String,
            enum: ['low', 'medium', 'high']
        }
    },
    planting_details: {
        seed_rate: {
            value: Number,
            unit: String
        },
        spacing: {
            row_to_row: {
                value: Number,
                unit: String
            },
            plant_to_plant: {
                value: Number,
                unit: String
            }
        },
        depth: {
            value: Number,
            unit: String
        },
        method: {
            type: String,
            enum: ['direct_sowing', 'transplanting', 'cutting', 'layering', 'rhizome_planting'],
            default: 'direct_sowing'
        }
    },
    growth_stages: [growthStageSchema],
    nutrient_management: {
        nitrogen: {
            requirement: {
                value: Number,
                unit: String
            },
            schedule: String
        },
        phosphorus: {
            requirement: {
                value: Number,
                unit: String
            },
            schedule: String
        },
        potassium: {
            requirement: {
                value: Number,
                unit: String
            },
            schedule: String
        },
        micronutrients: [{
            name: String,
            requirement: {
                value: Number,
                unit: String
            },
            deficiency_symptoms: String,
            application_method: String
        }]
    },
    pests_diseases: [pestDiseaseSchema],
    harvesting: {
        days_to_maturity: {
            min: Number,
            max: Number
        },
        indicators: [String],
        method: String,
        expected_yield: {
            min: Number,
            max: Number,
            unit: String
        }
    },
    post_harvest: {
        storage: {
            method: String,
            conditions: String,
            shelf_life: String
        },
        processing: [String]
    },
    market_info: {
        price_range: {
            min: Number,
            max: Number,
            currency: {
                type: String,
                default: 'INR'
            }
        },
        demand_trend: {
            type: String,
            trim: true
        },
        major_markets: [String]
    },
    economics: {
        cost_of_cultivation: {
            value: Number,
            unit: {
                type: String,
                default: 'INR/hectare'
            }
        },
        benefit_cost_ratio: Number
    },
    region_specific_notes: [{
        region: String,
        notes: String,
        varieties: [String]
    }],
    references: [String],
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'AdminLogin'
    },
    updated_by: {
        type: Schema.Types.ObjectId,
        ref: 'AdminLogin'
    }
});

// Pre-save middleware to update the updatedAt field
cropSchema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
});

// Method to get crop recommendation based on input parameters
// Helper: Derive climate data from location (state/district)
function deriveClimateFromLocation(location) {
    if (!location) return null;
    
    // Simple mapping - can be enhanced with API calls
    const locationData = {
        'punjab': { avgRainfall: 600, avgTemp: 25, climateZone: 'Temperate' },
        'haryana': { avgRainfall: 550, avgTemp: 26, climateZone: 'Semi-arid' },
        'uttar pradesh': { avgRainfall: 1000, avgTemp: 27, climateZone: 'Subtropical' },
        'maharashtra': { avgRainfall: 1200, avgTemp: 28, climateZone: 'Tropical' },
        'karnataka': { avgRainfall: 1100, avgTemp: 27, climateZone: 'Tropical' },
        'tamil nadu': { avgRainfall: 950, avgTemp: 29, climateZone: 'Tropical' },
        'andhra pradesh': { avgRainfall: 900, avgTemp: 29, climateZone: 'Tropical' },
        'telangana': { avgRainfall: 900, avgTemp: 29, climateZone: 'Tropical' },
        'west bengal': { avgRainfall: 1500, avgTemp: 26, climateZone: 'Subtropical' },
        'bihar': { avgRainfall: 1200, avgTemp: 27, climateZone: 'Subtropical' }
    };
    
    const locLower = location.toLowerCase();
    for (const [state, data] of Object.entries(locationData)) {
        if (locLower.includes(state)) {
            return data;
        }
    }
    
    // Default fallback
    return { avgRainfall: 800, avgTemp: 27, climateZone: 'Tropical' };
}

// Helper: Map season names to months (Kharif/Rabi/Summer)
function getSeasonMonths(season) {
    const seasonMap = {
        'kharif': [6, 7, 8, 9, 10], // Monsoon season
        'rabi': [10, 11, 12, 1, 2], // Winter season
        'summer': [3, 4, 5, 6], // Summer season
        'winter': [11, 12, 1, 2],
        'monsoon': [6, 7, 8, 9],
        'autumn': [9, 10, 11]
    };
    return seasonMap[season?.toLowerCase()] || [];
}

// Helper: Calculate accuracy level based on filled fields
function calculateAccuracy(params) {
    const criticalFields = ['soil_type', 'season'];
    const importantFields = ['ph', 'rainfall', 'temperature', 'water_availability'];
    const optionalFields = ['budget_level', 'risk_preference', 'experience_level', 'plot_size'];
    
    let filled = 0;
    let total = 0;
    
    criticalFields.forEach(f => { if (params[f]) filled++; total++; });
    importantFields.forEach(f => { if (params[f]) filled++; total++; });
    optionalFields.forEach(f => { if (params[f]) filled++; total++; });
    
    const ratio = filled / total;
    if (ratio >= 0.8) return 'High';
    if (ratio >= 0.5) return 'Medium';
    return 'Low';
}

cropSchema.statics.getRecommendations = async function(params) {
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
        min_score = 0 // allow returning all crops when set to 0
    } = params;

    // ENFORCE: soil_type is required
    if (!soil_type) {
        throw new Error('soil_type is required for crop recommendations');
    }

    // Derive missing climate data from location if available
    let derivedRainfall = rainfall;
    let derivedTemp = temperature;
    let derivedClimateZone = null;
    
    if (location) {
        const climateData = deriveClimateFromLocation(location);
        if (climateData) {
            if (!derivedRainfall) derivedRainfall = climateData.avgRainfall;
            if (!derivedTemp) derivedTemp = climateData.avgTemp;
            derivedClimateZone = climateData.climateZone;
        }
    }

    // Calculate accuracy indicator
    const accuracy = calculateAccuracy(params);

    // Get all crops (we'll score them all, not filter upfront)
    let query = this.find();
    
    // Only filter by category if specified (optional filter)
    if (crop_category) {
        query = query.where('categories').in([crop_category]);
    }

    const allCrops = await query.exec();

    // WEIGHTED SCORING SYSTEM (0-100 scale)
    const scoredCrops = allCrops.map(crop => {
        let soilScore = 0;
        let climateWaterScore = 0;
        let seasonScore = 0;
        let economicsScore = 0;

        // 1. SOIL MATCH (30-40% weight) = 35%
        if (soil_type) {
            const soilTypes = crop.soil_requirements?.soil_types || [];
            if (soilTypes.includes(soil_type)) {
                soilScore = 100; // Perfect match
            } else {
                // Check for compatible soils (e.g., loamy vs sandy loam)
                const compatible = {
                    'loamy': ['sandy loam', 'clay loam'],
                    'sandy': ['sandy loam'],
                    'clayey': ['clay loam', 'loamy'],
                    'black': ['loamy', 'clayey']
                };
                if (compatible[soil_type]?.some(s => soilTypes.includes(s))) {
                    soilScore = 70; // Partial match
                } else {
                    soilScore = 30; // Poor match but not impossible
                }
            }
            
            // pH bonus/penalty (if provided)
            if (ph && crop.soil_requirements?.ph_range) {
                const phRange = crop.soil_requirements.ph_range;
                if (ph >= phRange.min && ph <= phRange.max) {
                    const optimalDiff = Math.abs(ph - (phRange.optimal || (phRange.min + phRange.max) / 2));
                    if (optimalDiff < 0.5) {
                        soilScore = Math.min(100, soilScore + 20); // Optimal pH bonus
                    } else {
                        soilScore = Math.min(100, soilScore + 10); // Within range bonus
                    }
                } else {
                    soilScore = Math.max(0, soilScore - 20); // pH penalty
                }
            }
        }

        // 2. CLIMATE & WATER MATCH (30-40% weight) = 35%
        if (derivedRainfall && crop.water_requirements?.annual_rainfall) {
            const rainRange = crop.water_requirements.annual_rainfall;
            if (derivedRainfall >= rainRange.min && derivedRainfall <= rainRange.max) {
                climateWaterScore += 50; // Perfect rainfall match
            } else if (derivedRainfall < rainRange.min) {
                climateWaterScore += Math.max(0, 50 - (rainRange.min - derivedRainfall) / 10); // Penalty for low rain
            } else {
                climateWaterScore += Math.max(0, 50 - (derivedRainfall - rainRange.max) / 10); // Penalty for high rain
            }
        } else {
            climateWaterScore += 30; // Neutral if no rainfall data
        }

        if (derivedTemp && crop.climate_zones?.[0]?.temperature_range) {
            const tempRange = crop.climate_zones[0].temperature_range;
            if (derivedTemp >= tempRange.min && derivedTemp <= tempRange.max) {
                climateWaterScore += 30; // Perfect temp match
            } else {
                climateWaterScore += Math.max(0, 30 - Math.abs(derivedTemp - (tempRange.min + tempRange.max) / 2) / 2);
            }
        } else {
            climateWaterScore += 20; // Neutral if no temp data
        }

        // Water availability match
        if (water_availability && crop.water_requirements?.drought_tolerance) {
            const tolerance = crop.water_requirements.drought_tolerance;
            if (water_availability === 'low' && tolerance === 'high') {
                climateWaterScore += 20;
            } else if (water_availability === 'medium' && ['medium', 'high'].includes(tolerance)) {
                climateWaterScore += 20;
            } else if (water_availability === 'high') {
                climateWaterScore += 10; // Most crops can handle high water
            } else {
                climateWaterScore = Math.max(0, climateWaterScore - 20); // Mismatch penalty
            }
        } else {
            climateWaterScore += 10; // Neutral
        }

        climateWaterScore = Math.min(100, climateWaterScore);

        // 3. SEASON & DURATION (10-20% weight) = 15%
        if (season) {
            const seasonMonths = getSeasonMonths(season);
            const currentMonth = new Date().getMonth() + 1;
            
            const seasonMatch = crop.climate_zones?.some(zone => {
                const sowStart = zone.sowing_window?.start_month;
                const sowEnd = zone.sowing_window?.end_month;
                if (!sowStart || !sowEnd) return false;
                
                // Check if any season month overlaps with crop's sowing window
                return seasonMonths.some(month => month >= sowStart && month <= sowEnd);
            });

            if (seasonMatch) {
                seasonScore = 100; // Perfect season match
            } else {
                seasonScore = 30; // Poor match
            }
        } else {
            seasonScore = 50; // Neutral if no season specified
        }

        // 4. ECONOMICS & FARMER PROFILE (10-20% weight) = 15%
        if (budget_level && crop.economics?.cost_of_cultivation?.value) {
            const cost = crop.economics.cost_of_cultivation.value;
            const budgetRanges = {
                'low': [0, 30000],
                'medium': [30000, 60000],
                'high': [60000, Infinity]
            };
            const [min, max] = budgetRanges[budget_level] || [0, Infinity];
            
            if (cost >= min && cost <= max) {
                economicsScore += 40; // Budget match
            } else if (cost < min) {
                economicsScore += 50; // Under budget (bonus)
            } else {
                economicsScore += Math.max(0, 40 - (cost - max) / 1000); // Over budget penalty
            }
        } else {
            economicsScore += 30; // Neutral
        }

        if (risk_preference && crop.market_info?.demand_trend) {
            const trend = crop.market_info.demand_trend;
            if (risk_preference === 'low' && trend === 'stable') {
                economicsScore += 30;
            } else if (risk_preference === 'medium' && trend !== 'decreasing') {
                economicsScore += 30;
            } else if (risk_preference === 'high' && trend === 'increasing') {
                economicsScore += 30;
            } else {
                economicsScore += 10; // Mismatch
            }
        } else {
            economicsScore += 20; // Neutral
        }

        if (experience_level) {
            const complexityCrops = ['saffron', 'vanilla', 'coffee', 'tea', 'grapes', 'orchids', 'cardamom'];
            const moderateCrops = ['cotton', 'sugarcane', 'tobacco', 'rice', 'wheat', 'maize', 'corn', 'potato'];
            const easyCrops = ['radish', 'spinach', 'lettuce', 'beans', 'peas', 'tomatoes', 'onion'];
            
            const cropName = crop.name.toLowerCase();
            if (experience_level === 'beginner' && easyCrops.some(e => cropName.includes(e))) {
                economicsScore += 30;
            } else if (experience_level === 'intermediate' && moderateCrops.some(m => cropName.includes(m))) {
                economicsScore += 30;
            } else if (experience_level === 'expert' && complexityCrops.some(c => cropName.includes(c))) {
                economicsScore += 30;
            } else {
                economicsScore += 15; // Neutral
            }
        } else {
            economicsScore += 20; // Neutral
        }

        economicsScore = Math.min(100, economicsScore);

        // FINAL WEIGHTED SCORE
        const finalScore = Math.round(
            0.35 * soilScore +
            0.35 * climateWaterScore +
            0.15 * seasonScore +
            0.15 * economicsScore
        );

        return {
            crop: crop,
            score: Math.max(0, Math.min(100, finalScore)),
            breakdown: {
                soil: Math.round(soilScore),
                climate_water: Math.round(climateWaterScore),
                season: Math.round(seasonScore),
                economics: Math.round(economicsScore)
            },
            accuracy: accuracy,
            why: generateWhyRecommendation(crop, {
                soil_type, 
                ph, 
                rainfall: derivedRainfall || rainfall, 
                season, 
                budget_level, 
                risk_preference,
                water_availability,
                experience_level
            })
        };
    });
    
    // Filter by minimum threshold (configurable; default 0 to return all sorted)
    const threshold = Number.isFinite(min_score) ? min_score : 0;
    const filteredCrops = scoredCrops
        .filter(item => item.score >= threshold)
        .sort((a, b) => b.score - a.score);
    
    return {
        recommendations: filteredCrops,
        accuracy: accuracy,
        total_crops_evaluated: allCrops.length,
        recommendations_count: filteredCrops.length
    };
};

// Helper function to generate explanation for recommendation
function generateWhyRecommendation(crop, params) {
    const reasons = [];
    
    // Soil type match
    if (params.soil_type && crop.soil_requirements.soil_types.includes(params.soil_type)) {
        reasons.push(`Suitable for ${params.soil_type} soil type`);
    }
    
    // pH match
    if (params.ph && params.ph >= crop.soil_requirements.ph_range.min && 
        params.ph <= crop.soil_requirements.ph_range.max) {
        const optimalDiff = Math.abs(params.ph - crop.soil_requirements.ph_range.optimal);
        if (optimalDiff < 0.5) {
            reasons.push(`Ideal pH level of ${params.ph} (optimal for this crop)`);
        } else {
            reasons.push(`Compatible with soil pH of ${params.ph}`);
        }
    }
    
    // Rainfall match
    if (params.rainfall && params.rainfall >= crop.water_requirements.annual_rainfall.min && 
        params.rainfall <= crop.water_requirements.annual_rainfall.max) {
        reasons.push(`Suitable for annual rainfall of ${params.rainfall} mm`);
    }
    
    // Season match
    if (params.season) {
        const seasonMonths = {
            'winter': [11, 12, 1, 2],
            'summer': [3, 4, 5, 6],
            'monsoon': [6, 7, 8, 9],
            'autumn': [9, 10, 11]
        };
        
        const currentMonth = new Date().getMonth() + 1; // 1-12
        const isCurrentSeason = seasonMonths[params.season]?.includes(currentMonth);
        
        if (isCurrentSeason) {
            reasons.push(`Ideal planting time in the current ${params.season} season`);
        } else {
            const targetMonths = seasonMonths[params.season] || [];
            const futureSeasonMatch = crop.climate_zones.some(zone => 
                targetMonths.some(month => 
                    month >= zone.sowing_window.start_month && 
                    month <= zone.sowing_window.end_month
                )
            );
            
            if (futureSeasonMatch) {
                reasons.push(`Can be planted in the ${params.season} season`);
            }
        }
    }
    
    // Budget match
    if (params.budget_level && crop.economics.cost_of_cultivation.value) {
        const costValue = crop.economics.cost_of_cultivation.value;
        if (params.budget_level === 'low' && costValue <= 30000) {
            reasons.push(`Low cultivation cost (${costValue} ${crop.economics.cost_of_cultivation.unit}) fits your budget`);
        } else if (params.budget_level === 'medium' && costValue > 30000 && costValue <= 60000) {
            reasons.push(`Medium cultivation cost (${costValue} ${crop.economics.cost_of_cultivation.unit}) fits your budget`);
        } else if (params.budget_level === 'high' && costValue > 60000) {
            reasons.push(`Higher investment crop with potential for greater returns`);
        }
    }
    
    // Risk preference
    if (params.risk_preference && crop.market_info.demand_trend) {
        if (params.risk_preference === 'low' && crop.market_info.demand_trend === 'stable') {
            reasons.push('Market demand is stable - lower risk option');
        } else if (params.risk_preference === 'medium' && crop.market_info.demand_trend !== 'decreasing') {
            reasons.push('Market demand is favorable - balanced risk-reward');
        } else if (params.risk_preference === 'high' && crop.market_info.demand_trend === 'increasing') {
            reasons.push('Market demand is increasing - higher potential returns');
        }
    }
    
    // Water availability
    if (params.water_availability && crop.water_requirements.drought_tolerance) {
        if (params.water_availability === 'low' && crop.water_requirements.drought_tolerance === 'high') {
            reasons.push('High drought tolerance - suitable for limited water availability');
        } else if (params.water_availability === 'medium' && 
                  ['medium', 'high'].includes(crop.water_requirements.drought_tolerance)) {
            reasons.push('Good drought tolerance - suitable for your water availability');
        }
    }
    
    // Experience level
    if (params.experience_level) {
        const complexityCrops = ['saffron', 'vanilla', 'coffee', 'tea', 'grapes', 'orchids'];
        const moderateCrops = ['cotton', 'sugarcane', 'tobacco', 'rice', 'wheat', 'maize'];
        const easyCrops = ['radish', 'spinach', 'lettuce', 'beans', 'peas', 'tomatoes'];
        
        const cropName = crop.name.toLowerCase();
        
        if (params.experience_level === 'beginner' && easyCrops.includes(cropName)) {
            reasons.push('Easy to grow - suitable for beginners');
        } else if (params.experience_level === 'intermediate' && moderateCrops.includes(cropName)) {
            reasons.push('Moderate complexity - good match for your experience level');
        } else if (params.experience_level === 'expert' && complexityCrops.includes(cropName)) {
            reasons.push('Complex cultivation - suitable for experienced farmers');
        }
    }
    
    // Add economic benefit
    reasons.push(`Expected yield: ${crop.harvesting.expected_yield.min}-${crop.harvesting.expected_yield.max} ${crop.harvesting.expected_yield.unit}`);
    
    // Add benefit-cost ratio if available
    if (crop.economics.benefit_cost_ratio) {
        reasons.push(`Benefit-cost ratio: ${crop.economics.benefit_cost_ratio}`);
    }
    
    // Add maturity information
    reasons.push(`Days to maturity: ${crop.harvesting.days_to_maturity.min}-${crop.harvesting.days_to_maturity.max} days`);
    
    return reasons;
}

const Crop = mongoose.model('Crop', cropSchema);

module.exports = Crop;