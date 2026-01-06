// Seed minimal crops so Crop Advisor returns results
const mongoose = require("mongoose");
const Crop = require("./models/cropModel");

const data = [
  {
    name: "wheat",
    description: "Staple cereal crop",
    categories: ["cereal"],
    default_growth_cycle_days: 120,
    typical_season_months: [11, 12, 1, 2],
    soil_requirements: {
      soil_types: ["loamy", "clay", "alluvial", "black"],
      ph_range: { min: 6, max: 7.5, optimal: 6.8 },
      drainage: "good"
    },
    climate_zones: [{
      zone_name: "temperate",
      sowing_window: { start_month: 11, end_month: 12 },
      temperature_range: { min: 10, max: 28 },
      rainfall_requirement: { min: 500, max: 900 }
    }],
    water_requirements: {
      annual_rainfall: { min: 500, max: 900 },
      drought_tolerance: "medium"
    },
    harvesting: {
      days_to_maturity: { min: 110, max: 130 },
      expected_yield: { min: 2.5, max: 4, unit: "t/ha" }
    },
    economics: { cost_of_cultivation: { value: 40000, unit: "INR/hectare" }, benefit_cost_ratio: 1.8 }
  },
  {
    name: "rice",
    description: "Paddy crop",
    categories: ["cereal"],
    default_growth_cycle_days: 140,
    typical_season_months: [6, 7, 8, 9],
    soil_requirements: {
      soil_types: ["clay", "loamy", "alluvial"],
      ph_range: { min: 5.5, max: 7.5, optimal: 6.5 },
      drainage: "moderate"
    },
    climate_zones: [{
      zone_name: "tropical",
      sowing_window: { start_month: 6, end_month: 7 },
      temperature_range: { min: 20, max: 35 },
      rainfall_requirement: { min: 1000, max: 2000 }
    }],
    water_requirements: {
      annual_rainfall: { min: 1000, max: 2000 },
      drought_tolerance: "low"
    },
    harvesting: {
      days_to_maturity: { min: 130, max: 150 },
      expected_yield: { min: 3, max: 6, unit: "t/ha" }
    },
    economics: { cost_of_cultivation: { value: 50000, unit: "INR/hectare" }, benefit_cost_ratio: 1.7 }
  }
];

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI not set");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  await Crop.deleteMany({ name: { $in: data.map(d => d.name) } });
  await Crop.insertMany(data);
  console.log("Seeded crops:", data.map(c => c.name));
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

