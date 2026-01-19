/**
 * Script to expand crop database to 100+ varieties
 * Run with: node scripts/expandCrops.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Crop = require('../models/cropModel');

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

// Template function to create crop data
function createCrop(name, scientific_name, categories, baseData = {}) {
    return {
        name,
        scientific_name,
        categories: Array.isArray(categories) ? categories : [categories],
        description: baseData.description || `${name} is a widely cultivated crop in India.`,
        climate_zones: baseData.climate_zones || [{
            zone_name: 'Tropical',
            sowing_window: { start_month: 6, end_month: 7 },
            temperature_range: { min: 20, max: 35, unit: 'celsius' },
            rainfall_requirement: { min: 500, max: 1000, unit: 'mm' }
        }],
        soil_requirements: baseData.soil_requirements || {
            soil_types: ['loamy', 'black'],
            ph_range: { min: 6, max: 7.5, optimal: 6.5 },
            drainage: 'good'
        },
        water_requirements: baseData.water_requirements || {
            annual_rainfall: { min: 500, max: 1000, unit: 'mm' },
            irrigation_schedule: { frequency: 'Every 10-15 days', critical_stages: ['Flowering', 'Fruit development'] },
            drought_tolerance: 'medium'
        },
        planting_details: baseData.planting_details || {
            seed_rate: { value: 10, unit: 'kg/ha' },
            spacing: {
                row_to_row: { value: 45, unit: 'cm' },
                plant_to_plant: { value: 30, unit: 'cm' }
            },
            depth: { value: 3, unit: 'cm' },
            method: 'direct_sowing'
        },
        growth_stages: baseData.growth_stages || [],
        nutrient_management: baseData.nutrient_management || {
            nitrogen: { requirement: { value: 100, unit: 'kg/ha' } },
            phosphorus: { requirement: { value: 50, unit: 'kg/ha' } },
            potassium: { requirement: { value: 50, unit: 'kg/ha' } }
        },
        pests_diseases: baseData.pests_diseases || [],
        harvesting: baseData.harvesting || {
            days_to_maturity: { min: 90, max: 120 },
            indicators: ['Mature appearance'],
            method: 'Manual harvesting',
            expected_yield: { min: 2, max: 4, unit: 't/ha' }
        },
        post_harvest: baseData.post_harvest || {
            storage: { method: 'Dry storage', conditions: 'Cool, dry place', shelf_life: '6-12 months' },
            processing: ['Cleaning', 'Drying']
        },
        market_info: baseData.market_info || {
            price_range: { min: 20, max: 50, currency: 'INR' },
            demand_trend: 'stable',
            major_markets: ['Local markets', 'Export']
        },
        economics: baseData.economics || {
            cost_of_cultivation: { value: 50000, unit: 'INR/hectare' },
            benefit_cost_ratio: 1.5
        }
    };
}

// Expanded crop list - 100+ varieties
const expandedCrops = [
    // CEREALS (15)
    createCrop('Rice', 'Oryza sativa', 'cereal'),
    createCrop('Wheat', 'Triticum aestivum', 'cereal'),
    createCrop('Maize', 'Zea mays', 'cereal'),
    createCrop('Barley', 'Hordeum vulgare', 'cereal'),
    createCrop('Sorghum', 'Sorghum bicolor', 'cereal'),
    createCrop('Pearl Millet', 'Pennisetum glaucum', 'cereal'),
    createCrop('Finger Millet', 'Eleusine coracana', 'cereal'),
    createCrop('Foxtail Millet', 'Setaria italica', 'cereal'),
    createCrop('Little Millet', 'Panicum sumatrense', 'cereal'),
    createCrop('Kodo Millet', 'Paspalum scrobiculatum', 'cereal'),
    createCrop('Barnyard Millet', 'Echinochloa esculenta', 'cereal'),
    createCrop('Proso Millet', 'Panicum miliaceum', 'cereal'),
    createCrop('Buckwheat', 'Fagopyrum esculentum', 'cereal'),
    createCrop('Amaranth', 'Amaranthus cruentus', 'cereal'),
    createCrop('Quinoa', 'Chenopodium quinoa', 'cereal'),

    // PULSES (20)
    createCrop('Chickpea', 'Cicer arietinum', 'pulse'),
    createCrop('Pigeon Pea', 'Cajanus cajan', 'pulse'),
    createCrop('Black Gram', 'Vigna mungo', 'pulse'),
    createCrop('Green Gram', 'Vigna radiata', 'pulse'),
    createCrop('Red Gram', 'Cajanus cajan', 'pulse'),
    createCrop('Lentil', 'Lens culinaris', 'pulse'),
    createCrop('Peas', 'Pisum sativum', 'pulse'),
    createCrop('Kidney Bean', 'Phaseolus vulgaris', 'pulse'),
    createCrop('Lima Bean', 'Phaseolus lunatus', 'pulse'),
    createCrop('Cowpea', 'Vigna unguiculata', 'pulse'),
    createCrop('Horse Gram', 'Macrotyloma uniflorum', 'pulse'),
    createCrop('Moth Bean', 'Vigna aconitifolia', 'pulse'),
    createCrop('Rice Bean', 'Vigna umbellata', 'pulse'),
    createCrop('Soybean', 'Glycine max', 'pulse'),
    createCrop('Faba Bean', 'Vicia faba', 'pulse'),
    createCrop('Lupin', 'Lupinus', 'pulse'),
    createCrop('Adzuki Bean', 'Vigna angularis', 'pulse'),
    createCrop('Mung Bean', 'Vigna radiata', 'pulse'),
    createCrop('Black-eyed Pea', 'Vigna unguiculata', 'pulse'),
    createCrop('Fenugreek', 'Trigonella foenum-graecum', ['pulse', 'spice']),

    // OILSEEDS (15)
    createCrop('Groundnut', 'Arachis hypogaea', 'oilseed'),
    createCrop('Mustard', 'Brassica juncea', 'oilseed'),
    createCrop('Sunflower', 'Helianthus annuus', 'oilseed'),
    createCrop('Sesame', 'Sesamum indicum', 'oilseed'),
    createCrop('Safflower', 'Carthamus tinctorius', 'oilseed'),
    createCrop('Linseed', 'Linum usitatissimum', 'oilseed'),
    createCrop('Castor', 'Ricinus communis', 'oilseed'),
    createCrop('Niger', 'Guizotia abyssinica', 'oilseed'),
    createCrop('Rapeseed', 'Brassica napus', 'oilseed'),
    createCrop('Canola', 'Brassica napus', 'oilseed'),
    createCrop('Soybean Oil', 'Glycine max', 'oilseed'),
    createCrop('Coconut', 'Cocos nucifera', ['oilseed', 'fruit']),
    createCrop('Oil Palm', 'Elaeis guineensis', 'oilseed'),
    createCrop('Jatropha', 'Jatropha curcas', 'oilseed'),
    createCrop('Pongamia', 'Pongamia pinnata', 'oilseed'),

    // VEGETABLES (25)
    createCrop('Tomato', 'Solanum lycopersicum', 'vegetable'),
    createCrop('Potato', 'Solanum tuberosum', 'vegetable'),
    createCrop('Onion', 'Allium cepa', 'vegetable'),
    createCrop('Brinjal', 'Solanum melongena', 'vegetable'),
    createCrop('Okra', 'Abelmoschus esculentus', 'vegetable'),
    createCrop('Cucumber', 'Cucumis sativus', 'vegetable'),
    createCrop('Bottle Gourd', 'Lagenaria siceraria', 'vegetable'),
    createCrop('Bitter Gourd', 'Momordica charantia', 'vegetable'),
    createCrop('Ridge Gourd', 'Luffa acutangula', 'vegetable'),
    createCrop('Sponge Gourd', 'Luffa cylindrica', 'vegetable'),
    createCrop('Pumpkin', 'Cucurbita maxima', 'vegetable'),
    createCrop('Watermelon', 'Citrullus lanatus', 'vegetable'),
    createCrop('Muskmelon', 'Cucumis melo', 'vegetable'),
    createCrop('Cabbage', 'Brassica oleracea', 'vegetable'),
    createCrop('Cauliflower', 'Brassica oleracea', 'vegetable'),
    createCrop('Broccoli', 'Brassica oleracea', 'vegetable'),
    createCrop('Carrot', 'Daucus carota', 'vegetable'),
    createCrop('Radish', 'Raphanus sativus', 'vegetable'),
    createCrop('Beetroot', 'Beta vulgaris', 'vegetable'),
    createCrop('Spinach', 'Spinacia oleracea', 'vegetable'),
    createCrop('Amaranth Leaves', 'Amaranthus', 'vegetable'),
    createCrop('Fenugreek Leaves', 'Trigonella foenum-graecum', 'vegetable'),
    createCrop('Coriander', 'Coriandrum sativum', ['vegetable', 'spice']),
    createCrop('Mint', 'Mentha', ['vegetable', 'spice']),
    createCrop('Curry Leaves', 'Murraya koenigii', ['vegetable', 'spice']),

    // SPICES (15)
    createCrop('Turmeric', 'Curcuma longa', 'spice'),
    createCrop('Ginger', 'Zingiber officinale', 'spice'),
    createCrop('Black Pepper', 'Piper nigrum', 'spice'),
    createCrop('Cardamom', 'Elettaria cardamomum', 'spice'),
    createCrop('Cumin', 'Cuminum cyminum', 'spice'),
    createCrop('Fennel', 'Foeniculum vulgare', 'spice'),
    createCrop('Coriander Seed', 'Coriandrum sativum', 'spice'),
    createCrop('Fenugreek Seed', 'Trigonella foenum-graecum', 'spice'),
    createCrop('Mustard Seed', 'Brassica juncea', 'spice'),
    createCrop('Red Chili', 'Capsicum annuum', 'spice'),
    createCrop('Green Chili', 'Capsicum annuum', 'spice'),
    createCrop('Garlic', 'Allium sativum', 'spice'),
    createCrop('Cinnamon', 'Cinnamomum verum', 'spice'),
    createCrop('Clove', 'Syzygium aromaticum', 'spice'),
    createCrop('Nutmeg', 'Myristica fragrans', 'spice'),

    // FRUITS (15)
    createCrop('Mango', 'Mangifera indica', 'fruit'),
    createCrop('Banana', 'Musa', 'fruit'),
    createCrop('Guava', 'Psidium guajava', 'fruit'),
    createCrop('Papaya', 'Carica papaya', 'fruit'),
    createCrop('Pomegranate', 'Punica granatum', 'fruit'),
    createCrop('Orange', 'Citrus sinensis', 'fruit'),
    createCrop('Lemon', 'Citrus limon', 'fruit'),
    createCrop('Sweet Lime', 'Citrus limetta', 'fruit'),
    createCrop('Grapes', 'Vitis vinifera', 'fruit'),
    createCrop('Apple', 'Malus domestica', 'fruit'),
    createCrop('Pear', 'Pyrus', 'fruit'),
    createCrop('Peach', 'Prunus persica', 'fruit'),
    createCrop('Plum', 'Prunus domestica', 'fruit'),
    createCrop('Strawberry', 'Fragaria', 'fruit'),
    createCrop('Watermelon', 'Citrullus lanatus', 'fruit'),

    // FIBER CROPS (5)
    createCrop('Cotton', 'Gossypium hirsutum', 'fiber'),
    createCrop('Jute', 'Corchorus', 'fiber'),
    createCrop('Hemp', 'Cannabis sativa', 'fiber'),
    createCrop('Sisal', 'Agave sisalana', 'fiber'),
    createCrop('Coir', 'Cocos nucifera', 'fiber'),

    // CASH CROPS (5)
    createCrop('Sugarcane', 'Saccharum officinarum', 'cash'),
    createCrop('Tobacco', 'Nicotiana tabacum', 'cash'),
    createCrop('Tea', 'Camellia sinensis', 'cash'),
    createCrop('Coffee', 'Coffea', 'cash'),
    createCrop('Rubber', 'Hevea brasiliensis', 'cash'),

    // MEDICINAL (5)
    createCrop('Aloe Vera', 'Aloe barbadensis', 'medicinal'),
    createCrop('Tulsi', 'Ocimum tenuiflorum', 'medicinal'),
    createCrop('Neem', 'Azadirachta indica', 'medicinal'),
    createCrop('Ashwagandha', 'Withania somnifera', 'medicinal'),
    createCrop('Brahmi', 'Bacopa monnieri', 'medicinal')
];

async function main() {
    try {
        await mongoose.connect(mongoUri, { dbName: defaultDbName });
        console.log('✅ Connected to MongoDB');

        let created = 0;
        let skipped = 0;

        for (const cropData of expandedCrops) {
            try {
                const existing = await Crop.findOne({ name: new RegExp(`^${cropData.name}$`, 'i') });
                if (existing) {
                    skipped++;
                    continue;
                }
                await Crop.create(cropData);
                created++;
                console.log(`✓ Created: ${cropData.name}`);
            } catch (err) {
                console.error(`✗ Error creating ${cropData.name}:`, err.message);
            }
        }

        const total = await Crop.countDocuments();
        console.log(`\n✅ Seed complete!`);
        console.log(`   Created: ${created} new crops`);
        console.log(`   Skipped: ${skipped} existing crops`);
        console.log(`   Total crops in database: ${total}`);
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err);
        process.exit(1);
    }
}

main();

