/**
 * Advanced seed script to populate the database with comprehensive crop data
 * Run with: node scripts/seedCrops.js [--clear]
 * --clear flag will delete existing crops before seeding
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Crop = require('../models/cropModel');

// Use same DB connection method as app.js
const db_url = process.env.ATLASDB_URL;
const defaultDbName = process.env.DB_NAME || "cropconnect";

function buildMongoUri(rawUrl) {
    if (!rawUrl) {
        return `mongodb://127.0.0.1:27017/${defaultDbName}`;
    }
    const hasDbPath = /\/[^/?]+(\?|$)/.test(rawUrl.replace(/^mongodb\+srv:\/\//, "mongodb://"));
    if (hasDbPath) return rawUrl;
    return rawUrl.replace(/\/(\?|$)/, `/${defaultDbName}$1`);
}

const mongoUri = buildMongoUri(db_url);
const shouldClear = process.argv.includes('--clear');

// Comprehensive crop data (from mergeSeedData.js)
const cropData = [
    // SPICES
    {
        name: 'Turmeric',
        scientific_name: 'Curcuma longa',
        categories: ['spice', 'medicinal'],
        description: 'A rhizomatous herbaceous perennial plant of the ginger family, used as a culinary spice and for its medicinal properties.',
        climate_zones: [
            {
                zone_name: 'Tropical',
                sowing_window: { start_month: 5, end_month: 6 },
                temperature_range: { min: 20, max: 30, unit: 'celsius' },
                rainfall_requirement: { min: 1500, max: 2000, unit: 'mm' },
                humidity_range: { min: 70, max: 90 }
            }
        ],
        soil_requirements: {
            soil_types: ['loamy', 'sandy loam', 'red soil'],
            ph_range: { min: 5.5, max: 7.5, optimal: 6.5 },
            drainage: 'good'
        },
        water_requirements: {
            annual_rainfall: { min: 1500, max: 2000, unit: 'mm' },
            irrigation_schedule: { frequency: 'Every 7-10 days', critical_stages: ['Rhizome development', 'Vegetative growth'] },
            drought_tolerance: 'low'
        },
        planting_details: {
            seed_rate: { value: 2000, unit: 'kg/ha' },
            spacing: {
                row_to_row: { value: 30, unit: 'cm' },
                plant_to_plant: { value: 15, unit: 'cm' }
            },
            depth: { value: 5, unit: 'cm' },
            method: 'rhizome_planting'
        },
        growth_stages: [
            {
                name: 'Sprouting',
                days_from_sowing: { min: 10, max: 15 },
                description: 'Rhizomes sprout and initial shoots emerge',
                key_activities: ['Ensure adequate moisture', 'Monitor for pests'],
                irrigation_needs: { frequency: 'Keep soil moist', amount: 'Light' }
            },
            {
                name: 'Vegetative Growth',
                days_from_sowing: { min: 15, max: 90 },
                description: 'Plants develop leaves and pseudostems',
                key_activities: ['First fertilizer application', 'Weed control', 'Mulching'],
                irrigation_needs: { frequency: 'Every 7 days', amount: 'Moderate' }
            },
            {
                name: 'Rhizome Development',
                days_from_sowing: { min: 90, max: 180 },
                description: 'Rhizomes develop and expand',
                key_activities: ['Second fertilizer application', 'Earthing up', 'Pest monitoring'],
                irrigation_needs: { frequency: 'Every 7 days', amount: 'Heavy' }
            },
            {
                name: 'Maturity',
                days_from_sowing: { min: 240, max: 300 },
                description: 'Leaves turn yellow and begin to dry',
                key_activities: ['Reduce irrigation', 'Prepare for harvest'],
                irrigation_needs: { frequency: 'Reduce gradually', amount: 'Light to none' }
            }
        ],
        nutrient_management: {
            nitrogen: { requirement: { value: 120, unit: 'kg/ha' }, schedule: 'Split application: 25% at planting, 50% at 45 days, 25% at 90 days' },
            phosphorus: { requirement: { value: 60, unit: 'kg/ha' }, schedule: '100% at planting' },
            potassium: { requirement: { value: 120, unit: 'kg/ha' }, schedule: '50% at planting, 50% at 90 days' },
            micronutrients: [
                {
                    name: 'Zinc',
                    requirement: { value: 5, unit: 'kg/ha' },
                    deficiency_symptoms: 'Interveinal chlorosis, stunted growth',
                    application_method: 'Soil application'
                }
            ]
        },
        pests_diseases: [
            {
                name: 'Rhizome Rot',
                type: 'disease',
                symptoms: 'Yellowing and wilting of leaves, soft rot of rhizomes',
                threshold: 'First symptoms',
                treatments: [
                    { name: 'Metalaxyl', method: 'Soil drench', dosage: '2 g/L', frequency: 'Once at symptoms', organic: false },
                    { name: 'Trichoderma', method: 'Soil application', dosage: '2.5 kg/ha', frequency: 'Before planting', organic: true }
                ],
                preventive_measures: ['Crop rotation', 'Well-drained soil', 'Healthy rhizomes for planting']
            },
            {
                name: 'Shoot Borer',
                type: 'pest',
                symptoms: 'Dead shoots with holes, frass inside pseudostems',
                threshold: '5% affected shoots',
                treatments: [
                    { name: 'Chlorantraniliprole', method: 'Spray', dosage: '0.3 ml/L', frequency: 'Once at threshold', organic: false },
                    { name: 'Neem oil', method: 'Spray', dosage: '5 ml/L', frequency: 'Weekly', organic: true }
                ],
                preventive_measures: ['Field sanitation', 'Removal of affected shoots', 'Crop rotation']
            }
        ],
        harvesting: {
            days_to_maturity: { min: 240, max: 300 },
            indicators: ['Yellowing and drying of leaves', 'Rhizomes with characteristic color and aroma'],
            method: 'Manual digging of rhizomes',
            expected_yield: { min: 20, max: 30, unit: 'tons/ha' }
        },
        post_harvest: {
            storage: {
                method: 'Clean, dry place',
                conditions: 'Cool, dry place with good ventilation',
                shelf_life: '6-12 months for fresh rhizomes, 2-3 years for dried powder'
            },
            processing: ['Cleaning', 'Boiling', 'Drying', 'Polishing', 'Grinding']
        },
        market_info: {
            price_range: { min: 70, max: 150, currency: 'INR' },
            demand_trend: 'increasing',
            major_markets: ['Spice industry', 'Pharmaceutical industry', 'Export markets']
        },
        economics: {
            cost_of_cultivation: { value: 150000, unit: 'INR/hectare' },
            benefit_cost_ratio: 2.5
        }
    },
    {
        name: 'Maize',
        scientific_name: 'Zea mays',
        categories: ['cereal'],
        description: 'Warm-season cereal grown widely for grain and fodder.',
        climate_zones: [{
            zone_name: 'Tropical',
            sowing_window: { start_month: 6, end_month: 7 },
            temperature_range: { min: 18, max: 32, unit: 'celsius' },
            rainfall_requirement: { min: 500, max: 800, unit: 'mm' }
        }],
        soil_requirements: {
            soil_types: ['loamy', 'alluvial', 'black'],
            ph_range: { min: 5.8, max: 7.5, optimal: 6.5 },
            drainage: 'good'
        },
        water_requirements: {
            annual_rainfall: { min: 500, max: 800, unit: 'mm' },
            irrigation_schedule: { frequency: 'Every 10-12 days', critical_stages: ['Knee-high', 'Silking', 'Grain filling'] },
            drought_tolerance: 'medium'
        },
        planting_details: {
            seed_rate: { value: 20, unit: 'kg/ha' },
            spacing: { row_to_row: { value: 60, unit: 'cm' }, plant_to_plant: { value: 20, unit: 'cm' } },
            depth: { value: 4, unit: 'cm' },
            method: 'direct_sowing'
        },
        growth_stages: [],
        nutrient_management: {
            nitrogen: { requirement: { value: 150, unit: 'kg/ha' }, schedule: 'Split: basal + knee-high + tasseling' },
            phosphorus: { requirement: { value: 60, unit: 'kg/ha' }, schedule: 'Basal' },
            potassium: { requirement: { value: 40, unit: 'kg/ha' }, schedule: 'Basal' }
        },
        pests_diseases: [],
        harvesting: {
            days_to_maturity: { min: 110, max: 140 },
            indicators: ['Black layer formation', 'Dry husk'],
            method: 'cob picking',
            expected_yield: { min: 3, max: 6, unit: 't/ha' }
        },
        post_harvest: { storage: { method: 'Drying and shelling', conditions: 'Dry, ventilated', shelf_life: '6-12 months' }, processing: ['Shelling', 'Drying'] },
        market_info: { price_range: { min: 12, max: 20, currency: 'INR' }, demand_trend: 'stable', major_markets: ['Feed', 'Food'] },
        economics: { cost_of_cultivation: { value: 35000, unit: 'INR/hectare' }, benefit_cost_ratio: 1.6 }
    },
    {
        name: 'Cotton',
        scientific_name: 'Gossypium hirsutum',
        categories: ['fiber'],
        description: 'Fiber crop cultivated in Kharif season.',
        climate_zones: [{
            zone_name: 'Tropical',
            sowing_window: { start_month: 6, end_month: 7 },
            temperature_range: { min: 20, max: 35, unit: 'celsius' },
            rainfall_requirement: { min: 600, max: 900, unit: 'mm' }
        }],
        soil_requirements: {
            soil_types: ['black', 'loamy'],
            ph_range: { min: 6, max: 8, optimal: 7 },
            drainage: 'good'
        },
        water_requirements: {
            annual_rainfall: { min: 600, max: 900, unit: 'mm' },
            irrigation_schedule: { frequency: 'Every 15-20 days', critical_stages: ['Square formation', 'Boll formation'] },
            drought_tolerance: 'medium'
        },
        planting_details: {
            seed_rate: { value: 12, unit: 'kg/ha' },
            spacing: { row_to_row: { value: 90, unit: 'cm' }, plant_to_plant: { value: 60, unit: 'cm' } },
            depth: { value: 3, unit: 'cm' },
            method: 'direct_sowing'
        },
        growth_stages: [],
        nutrient_management: {
            nitrogen: { requirement: { value: 100, unit: 'kg/ha' }, schedule: 'Split: basal + 45 DAS' },
            phosphorus: { requirement: { value: 50, unit: 'kg/ha' }, schedule: 'Basal' },
            potassium: { requirement: { value: 50, unit: 'kg/ha' }, schedule: 'Basal' }
        },
        pests_diseases: [],
        harvesting: {
            days_to_maturity: { min: 150, max: 180 },
            indicators: ['Open bolls'],
            method: 'Hand picking',
            expected_yield: { min: 1.5, max: 3, unit: 't/ha seed cotton' }
        },
        post_harvest: { storage: { method: 'Dry storage', conditions: 'Dry', shelf_life: 'Months' }, processing: ['Ginning'] },
        market_info: { price_range: { min: 50, max: 80, currency: 'INR' }, demand_trend: 'stable', major_markets: ['Textile'] },
        economics: { cost_of_cultivation: { value: 60000, unit: 'INR/hectare' }, benefit_cost_ratio: 1.5 }
    },
    {
        name: 'Soybean',
        scientific_name: 'Glycine max',
        categories: ['oilseed'],
        description: 'Major Kharif oilseed crop.',
        climate_zones: [{
            zone_name: 'Subtropical',
            sowing_window: { start_month: 6, end_month: 7 },
            temperature_range: { min: 20, max: 32, unit: 'celsius' },
            rainfall_requirement: { min: 700, max: 900, unit: 'mm' }
        }],
        soil_requirements: {
            soil_types: ['loamy', 'black'],
            ph_range: { min: 6, max: 7.5, optimal: 6.8 },
            drainage: 'good'
        },
        water_requirements: {
            annual_rainfall: { min: 700, max: 900, unit: 'mm' },
            irrigation_schedule: { frequency: 'Every 12-15 days', critical_stages: ['Flowering', 'Pod filling'] },
            drought_tolerance: 'medium'
        },
        planting_details: {
            seed_rate: { value: 70, unit: 'kg/ha' },
            spacing: { row_to_row: { value: 45, unit: 'cm' }, plant_to_plant: { value: 5, unit: 'cm' } },
            depth: { value: 3, unit: 'cm' },
            method: 'direct_sowing'
        },
        growth_stages: [],
        nutrient_management: {
            nitrogen: { requirement: { value: 20, unit: 'kg/ha' }, schedule: 'Starter dose' },
            phosphorus: { requirement: { value: 60, unit: 'kg/ha' }, schedule: 'Basal' },
            potassium: { requirement: { value: 40, unit: 'kg/ha' }, schedule: 'Basal' }
        },
        pests_diseases: [],
        harvesting: {
            days_to_maturity: { min: 90, max: 110 },
            indicators: ['Yellowing leaves', 'Dry pods'],
            method: 'Manual/harvester',
            expected_yield: { min: 1.5, max: 2.5, unit: 't/ha' }
        },
        post_harvest: { storage: { method: 'Dry storage', conditions: 'Dry', shelf_life: 'Months' }, processing: ['Cleaning', 'Drying'] },
        market_info: { price_range: { min: 30, max: 45, currency: 'INR' }, demand_trend: 'increasing', major_markets: ['Oil', 'Feed'] },
        economics: { cost_of_cultivation: { value: 40000, unit: 'INR/hectare' }, benefit_cost_ratio: 1.6 }
    },
    {
        name: 'Tomato',
        scientific_name: 'Solanum lycopersicum',
        categories: ['vegetable'],
        description: 'Widely grown vegetable crop.',
        climate_zones: [{
            zone_name: 'Tropical/Subtropical',
            sowing_window: { start_month: 7, end_month: 9 },
            temperature_range: { min: 18, max: 30, unit: 'celsius' },
            rainfall_requirement: { min: 600, max: 800, unit: 'mm' }
        }],
        soil_requirements: {
            soil_types: ['loamy', 'sandy loam'],
            ph_range: { min: 6, max: 7, optimal: 6.5 },
            drainage: 'good'
        },
        water_requirements: {
            annual_rainfall: { min: 600, max: 800, unit: 'mm' },
            irrigation_schedule: { frequency: 'Every 7-10 days', critical_stages: ['Flowering', 'Fruit set'] },
            drought_tolerance: 'low'
        },
        planting_details: {
            seed_rate: { value: 0.5, unit: 'kg/ha' },
            spacing: { row_to_row: { value: 60, unit: 'cm' }, plant_to_plant: { value: 45, unit: 'cm' } },
            depth: { value: 1, unit: 'cm' },
            method: 'transplanting'
        },
        growth_stages: [],
        nutrient_management: {
            nitrogen: { requirement: { value: 120, unit: 'kg/ha' }, schedule: 'Split doses' },
            phosphorus: { requirement: { value: 60, unit: 'kg/ha' }, schedule: 'Basal' },
            potassium: { requirement: { value: 60, unit: 'kg/ha' }, schedule: 'Split doses' }
        },
        pests_diseases: [],
        harvesting: {
            days_to_maturity: { min: 110, max: 130 },
            indicators: ['Red ripe fruits'],
            method: 'Hand picking',
            expected_yield: { min: 40, max: 60, unit: 't/ha' }
        },
        post_harvest: { storage: { method: 'Cool storage', conditions: '15-20C', shelf_life: '1-2 weeks' }, processing: ['Sorting', 'Grading'] },
        market_info: { price_range: { min: 10, max: 40, currency: 'INR' }, demand_trend: 'volatile', major_markets: ['Fresh', 'Processing'] },
        economics: { cost_of_cultivation: { value: 120000, unit: 'INR/hectare' }, benefit_cost_ratio: 1.8 }
    },
    {
        name: 'Onion',
        scientific_name: 'Allium cepa',
        categories: ['vegetable'],
        description: 'Bulb vegetable crop grown in rabi and late kharif.',
        climate_zones: [{
            zone_name: 'Subtropical',
            sowing_window: { start_month: 10, end_month: 11 },
            temperature_range: { min: 13, max: 25, unit: 'celsius' },
            rainfall_requirement: { min: 600, max: 800, unit: 'mm' }
        }],
        soil_requirements: {
            soil_types: ['loamy', 'alluvial'],
            ph_range: { min: 6, max: 7.5, optimal: 6.5 },
            drainage: 'good'
        },
        water_requirements: {
            annual_rainfall: { min: 600, max: 800, unit: 'mm' },
            irrigation_schedule: { frequency: 'Every 7-10 days', critical_stages: ['Bulb formation'] },
            drought_tolerance: 'low'
        },
        planting_details: {
            seed_rate: { value: 5, unit: 'kg/ha' },
            spacing: { row_to_row: { value: 15, unit: 'cm' }, plant_to_plant: { value: 10, unit: 'cm' } },
            depth: { value: 1, unit: 'cm' },
            method: 'transplanting'
        },
        growth_stages: [],
        nutrient_management: {
            nitrogen: { requirement: { value: 100, unit: 'kg/ha' }, schedule: 'Split' },
            phosphorus: { requirement: { value: 50, unit: 'kg/ha' }, schedule: 'Basal' },
            potassium: { requirement: { value: 50, unit: 'kg/ha' }, schedule: 'Split' }
        },
        pests_diseases: [],
        harvesting: {
            days_to_maturity: { min: 110, max: 130 },
            indicators: ['Neck fall', 'Leaf drying'],
            method: 'Manual lifting',
            expected_yield: { min: 20, max: 30, unit: 't/ha' }
        },
        post_harvest: { storage: { method: 'Curing and dry storage', conditions: 'Cool, ventilated', shelf_life: '3-4 months' }, processing: ['Curing'] },
        market_info: { price_range: { min: 10, max: 40, currency: 'INR' }, demand_trend: 'volatile', major_markets: ['Fresh'] },
        economics: { cost_of_cultivation: { value: 80000, unit: 'INR/hectare' }, benefit_cost_ratio: 1.7 }
    },
    {
        name: 'Cardamom',
        scientific_name: 'Elettaria cardamomum',
        categories: ['spice'],
        description: 'Known as the "Queen of Spices", cardamom is a perennial herb with aromatic seeds used as a spice and in medicine.',
        climate_zones: [
            {
                zone_name: 'Tropical Highland',
                sowing_window: { start_month: 6, end_month: 7 },
                temperature_range: { min: 10, max: 30, unit: 'celsius' },
                rainfall_requirement: { min: 1500, max: 4000, unit: 'mm' },
                humidity_range: { min: 75, max: 95 }
            }
        ],
        soil_requirements: {
            soil_types: ['loamy', 'forest loam', 'rich in organic matter'],
            ph_range: { min: 5.5, max: 6.5, optimal: 6.0 },
            drainage: 'good'
        },
        water_requirements: {
            annual_rainfall: { min: 1500, max: 4000, unit: 'mm' },
            irrigation_schedule: { frequency: 'Every 7 days in dry season', critical_stages: ['Flowering', 'Capsule development'] },
            drought_tolerance: 'low'
        },
        planting_details: {
            seed_rate: { value: 200, unit: 'kg/ha' },
            spacing: {
                row_to_row: { value: 2, unit: 'm' },
                plant_to_plant: { value: 2, unit: 'm' }
            },
            depth: { value: 30, unit: 'cm' },
            method: 'rhizome_planting'
        },
        growth_stages: [
            {
                name: 'Establishment',
                days_from_sowing: { min: 0, max: 180 },
                description: 'Rhizomes establish and initial growth occurs',
                key_activities: ['Shade management', 'Irrigation', 'Weed control'],
                irrigation_needs: { frequency: 'Every 7 days', amount: 'Moderate' }
            },
            {
                name: 'Vegetative Growth',
                days_from_sowing: { min: 180, max: 365 },
                description: 'Plants develop pseudostems and leaves',
                key_activities: ['Fertilizer application', 'Mulching', 'Trashing'],
                irrigation_needs: { frequency: 'Every 7 days in dry season', amount: 'Moderate' }
            },
            {
                name: 'Flowering and Fruiting',
                days_from_sowing: { min: 365, max: 730 },
                description: 'Plants begin flowering and capsule formation (2nd year onwards)',
                key_activities: ['Pollination support', 'Pest management', 'Irrigation'],
                irrigation_needs: { frequency: 'Every 5 days during flowering', amount: 'Heavy' }
            },
            {
                name: 'Harvesting Stage',
                days_from_sowing: { min: 730, max: 1095 },
                description: 'Capsules mature and are ready for harvest',
                key_activities: ['Regular harvesting', 'Plant maintenance'],
                irrigation_needs: { frequency: 'Every 7 days', amount: 'Moderate' }
            }
        ],
        nutrient_management: {
            nitrogen: { requirement: { value: 100, unit: 'kg/ha' }, schedule: 'Split application: 25% in April-May, 50% in August-September, 25% in December-January' },
            phosphorus: { requirement: { value: 50, unit: 'kg/ha' }, schedule: '50% in April-May, 50% in August-September' },
            potassium: { requirement: { value: 150, unit: 'kg/ha' }, schedule: '50% in April-May, 50% in August-September' }
        },
        pests_diseases: [
            {
                name: 'Thrips',
                type: 'pest',
                symptoms: 'Scarring and discoloration of capsules, leaf damage',
                threshold: '5 thrips per leaf',
                treatments: [
                    { name: 'Spinosad', method: 'Spray', dosage: '0.5 ml/L', frequency: 'Once at threshold', organic: true },
                    { name: 'Neem oil', method: 'Spray', dosage: '5 ml/L', frequency: 'Weekly', organic: true }
                ],
                preventive_measures: ['Field sanitation', 'Proper spacing', 'Balanced nutrition']
            }
        ],
        harvesting: {
            days_to_maturity: { min: 730, max: 1095, notes: 'From planting to first harvest' },
            indicators: ['Full-sized green capsules', 'Mature seeds inside'],
            method: 'Manual picking of mature capsules',
            expected_yield: { min: 150, max: 250, unit: 'kg/ha' }
        },
        market_info: {
            price_range: { min: 700, max: 1500, currency: 'INR' },
            demand_trend: 'stable',
            major_markets: ['Spice industry', 'Export markets', 'Pharmaceutical industry']
        }
    },
    {
        name: 'Sunflower',
        scientific_name: 'Helianthus annuus',
        categories: ['oilseed'],
        description: 'An annual plant grown primarily for its edible oil and seeds.',
        climate_zones: [
            {
                zone_name: 'Temperate to Subtropical',
                sowing_window: { start_month: 6, end_month: 7 },
                temperature_range: { min: 20, max: 30, unit: 'celsius' },
                rainfall_requirement: { min: 500, max: 750, unit: 'mm' },
                humidity_range: { min: 50, max: 70 }
            }
        ],
        soil_requirements: {
            soil_types: ['loamy', 'sandy loam', 'clay loam'],
            ph_range: { min: 6.0, max: 7.5, optimal: 6.5 },
            drainage: 'good'
        },
        water_requirements: {
            annual_rainfall: { min: 500, max: 750, unit: 'mm' },
            irrigation_schedule: { frequency: 'Every 10-15 days', critical_stages: ['Seedling', 'Flowering', 'Seed filling'] },
            drought_tolerance: 'medium'
        },
        planting_details: {
            seed_rate: { value: 5, unit: 'kg/ha' },
            spacing: {
                row_to_row: { value: 60, unit: 'cm' },
                plant_to_plant: { value: 30, unit: 'cm' }
            },
            depth: { value: 3, unit: 'cm' },
            method: 'direct_sowing'
        },
        growth_stages: [
            {
                name: 'Germination and Seedling',
                days_from_sowing: { min: 0, max: 15 },
                description: 'Seeds germinate and seedlings establish',
                key_activities: ['Ensure adequate moisture', 'Thinning', 'Weed control'],
                irrigation_needs: { frequency: 'Keep soil moist', amount: 'Light' }
            },
            {
                name: 'Vegetative Growth',
                days_from_sowing: { min: 15, max: 40 },
                description: 'Plants develop stems and leaves',
                key_activities: ['First fertilizer application', 'Weed control', 'Thinning'],
                irrigation_needs: { frequency: 'Every 15 days', amount: 'Moderate' }
            },
            {
                name: 'Flowering',
                days_from_sowing: { min: 60, max: 75 },
                description: 'Flowers open and pollination occurs',
                key_activities: ['Irrigation management', 'Pollinator support', 'Disease monitoring'],
                irrigation_needs: { frequency: 'Every 7 days', amount: 'Heavy' }
            }
        ],
        nutrient_management: {
            nitrogen: { requirement: { value: 80, unit: 'kg/ha' }, schedule: 'Split application: 50% at sowing, 50% at bud formation' },
            phosphorus: { requirement: { value: 60, unit: 'kg/ha' }, schedule: '100% at sowing' },
            potassium: { requirement: { value: 40, unit: 'kg/ha' }, schedule: '100% at sowing' }
        },
        harvesting: {
            days_to_maturity: { min: 90, max: 110 },
            indicators: ['Back of head turns yellow to brown', 'Seeds with characteristic color and hardness'],
            method: 'Manual harvesting or combine harvester',
            expected_yield: { min: 1.5, max: 2.5, unit: 'tons/ha' }
        },
        market_info: {
            price_range: { min: 35, max: 60, currency: 'INR' },
            demand_trend: 'stable',
            major_markets: ['Oil industry', 'Food industry', 'Bird feed market']
        }
    }
];

// Function to seed crops
async function seedCrops() {
    try {
        await mongoose.connect(mongoUri, { dbName: defaultDbName });
        console.log(`✅ Connected to MongoDB at ${mongoUri} (db: ${defaultDbName})`);

        if (shouldClear) {
            await Crop.deleteMany({});
            console.log('🗑️  Cleared existing crop data');
        }

        // Check for duplicates
        const existingNames = await Crop.distinct('name');
        const newCrops = cropData.filter(c => !existingNames.includes(c.name));

        if (newCrops.length === 0) {
            console.log('ℹ️  All crops already exist in database');
            const count = await Crop.countDocuments();
            console.log(`Total crops in database: ${count}`);
        } else {
            const result = await Crop.insertMany(newCrops);
            console.log(`✅ Successfully seeded ${result.length} new crops`);
            const count = await Crop.countDocuments();
            console.log(`📊 Total crops in database: ${count}`);
        }

        mongoose.disconnect();
        console.log('✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding crops:', error);
        mongoose.disconnect();
        process.exit(1);
    }
}

seedCrops();
