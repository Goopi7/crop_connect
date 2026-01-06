const express = require('express');
const router = express.Router();
const Crop = require('../models/cropModel');
const { isLoggedIn, isFarmer, isAdmin } = require('../middleware');

// GET - Render crop recommendation form
router.get('/crops/recommend', isLoggedIn, (req, res) => {
    res.render('crops/recommend', { title: 'Crop Recommendation' });
});

// POST - Process crop recommendation request
router.post('/api/crops/recommend', isLoggedIn, async (req, res) => {
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
            limit = 10
        } = req.body;

        // Validate required fields
        if (!soil_type) {
            return res.status(400).json({ error: 'Soil type is required' });
        }

        // Get recommendations
        const recResult = await Crop.getRecommendations({
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
            market_distance: market_distance ? parseFloat(market_distance) : undefined,
            min_score: req.body.min_score !== undefined ? parseFloat(req.body.min_score) : 0
        });

        const recos = recResult?.recommendations || [];
        const take = Math.min(1, recos.length); // limit to top 1

        // Return recommendations with enhanced data (top 3 only)
        res.json({
            success: true,
            total_matches: recos.length,
            recommendations: recos.slice(0, take).map(item => ({
                name: item.crop.name,
                scientific_name: item.crop.scientific_name,
                categories: item.crop.categories,
                score: item.score,
                score_factors: item.breakdown,
                why: item.why,
                expected_yield: item.crop.harvesting.expected_yield,
                days_to_maturity: item.crop.harvesting.days_to_maturity,
                planting_details: item.crop.planting_details,
                water_requirements: {
                    annual_rainfall: item.crop.water_requirements.annual_rainfall,
                    drought_tolerance: item.crop.water_requirements.drought_tolerance,
                    irrigation_schedule: item.crop.water_requirements.irrigation_schedule
                },
                soil_requirements: {
                    soil_types: item.crop.soil_requirements.soil_types,
                    ph_range: item.crop.soil_requirements.ph_range,
                    drainage: item.crop.soil_requirements.drainage
                },
                climate_zones: item.crop.climate_zones.map(zone => ({
                    zone_name: zone.zone_name,
                    sowing_window: zone.sowing_window,
                    temperature_range: zone.temperature_range
                })),
                economics: {
                    cost_of_cultivation: item.crop.economics.cost_of_cultivation,
                    benefit_cost_ratio: item.crop.economics.benefit_cost_ratio
                },
                market_info: {
                    price_range: item.crop.market_info.price_range,
                    demand_trend: item.crop.market_info.demand_trend,
                    major_markets: item.crop.market_info.major_markets
                },
                region_specific_notes: item.crop.region_specific_notes,
                procedure: generateProcedure(item.crop)
            }))
        });
    } catch (error) {
        console.error('Error generating crop recommendations:', error);
        res.status(500).json({ 
            error: 'Failed to generate recommendations',
            message: error.message,
            success: false
        });
    }
});

// GET - Render crop knowledge base page
router.get('/crops', isLoggedIn, async (req, res) => {
    try {
        const crops = await Crop.find().sort('name');
        res.render('crops/index', { crops, title: 'Crop Knowledge Base' });
    } catch (error) {
        req.flash('error', 'Failed to load crops');
        res.redirect('/');
    }
});

// GET - Render single crop details
router.get('/crops/:id', isLoggedIn, async (req, res) => {
    try {
        const crop = await Crop.findById(req.params.id);
        if (!crop) {
            req.flash('error', 'Crop not found');
            return res.redirect('/crops');
        }
        res.render('crops/show', { crop, title: crop.name });
    } catch (error) {
        req.flash('error', 'Failed to load crop details');
        res.redirect('/crops');
    }
});

// Admin routes for CRUD operations
// GET - Render new crop form
router.get('/admin/crops/new', isAdmin, (req, res) => {
    res.render('admin/crops/new', { title: 'Add New Crop' });
});

// POST - Create new crop
router.post('/admin/crops', isAdmin, async (req, res) => {
    try {
        const cropData = req.body.crop;
        cropData.created_by = req.user._id;
        
        const newCrop = new Crop(cropData);
        await newCrop.save();
        
        req.flash('success', 'Successfully added new crop');
        res.redirect(`/crops/${newCrop._id}`);
    } catch (error) {
        console.error('Error creating crop:', error);
        req.flash('error', 'Failed to create crop');
        res.redirect('/admin/crops/new');
    }
});

// GET - Render edit crop form
router.get('/admin/crops/:id/edit', isAdmin, async (req, res) => {
    try {
        const crop = await Crop.findById(req.params.id);
        if (!crop) {
            req.flash('error', 'Crop not found');
            return res.redirect('/crops');
        }
        res.render('admin/crops/edit', { crop, title: `Edit ${crop.name}` });
    } catch (error) {
        req.flash('error', 'Failed to load crop');
        res.redirect('/crops');
    }
});

// PUT - Update crop
router.put('/admin/crops/:id', isAdmin, async (req, res) => {
    try {
        const cropData = req.body.crop;
        cropData.updated_by = req.user._id;
        cropData.updated_at = Date.now();
        
        const updatedCrop = await Crop.findByIdAndUpdate(req.params.id, cropData, { new: true });
        
        req.flash('success', 'Successfully updated crop');
        res.redirect(`/crops/${updatedCrop._id}`);
    } catch (error) {
        console.error('Error updating crop:', error);
        req.flash('error', 'Failed to update crop');
        res.redirect(`/admin/crops/${req.params.id}/edit`);
    }
});

// DELETE - Delete crop
router.delete('/admin/crops/:id', isAdmin, async (req, res) => {
    try {
        await Crop.findByIdAndDelete(req.params.id);
        req.flash('success', 'Successfully deleted crop');
        res.redirect('/crops');
    } catch (error) {
        console.error('Error deleting crop:', error);
        req.flash('error', 'Failed to delete crop');
        res.redirect('/crops');
    }
});

// Helper function to generate step-by-step procedure
function generateProcedure(crop) {
    const procedure = [];
    
    // Land preparation
    procedure.push({
        step: 'Land Preparation',
        description: `Prepare the land by plowing and leveling. Ensure proper drainage. Ideal soil type: ${crop.soil_requirements.soil_types.join(', ')}. Optimal soil pH: ${crop.soil_requirements.ph_range.optimal}.`
    });
    
    // Sowing
    procedure.push({
        step: 'Sowing',
        description: `Sow seeds at a rate of ${crop.planting_details.seed_rate.value} ${crop.planting_details.seed_rate.unit}. Plant at a depth of ${crop.planting_details.depth.value} ${crop.planting_details.depth.unit}. Maintain spacing of ${crop.planting_details.spacing.row_to_row.value} ${crop.planting_details.spacing.row_to_row.unit} between rows and ${crop.planting_details.spacing.plant_to_plant.value} ${crop.planting_details.spacing.plant_to_plant.unit} between plants.`
    });
    
    // Nutrient Management
    procedure.push({
        step: 'Nutrient Management',
        description: `Apply ${crop.nutrient_management.nitrogen.requirement.value} ${crop.nutrient_management.nitrogen.requirement.unit} of nitrogen, ${crop.nutrient_management.phosphorus.requirement.value} ${crop.nutrient_management.phosphorus.requirement.unit} of phosphorus, and ${crop.nutrient_management.potassium.requirement.value} ${crop.nutrient_management.potassium.requirement.unit} of potassium. ${crop.nutrient_management.nitrogen.schedule}`
    });
    
    // Irrigation
    procedure.push({
        step: 'Irrigation',
        description: `${crop.water_requirements.irrigation_schedule.frequency}. Critical stages for irrigation: ${crop.water_requirements.irrigation_schedule.critical_stages.join(', ')}.`
    });
    
    // Pest and Disease Management
    const pestDiseases = crop.pests_diseases.map(pd => 
        `${pd.name} (${pd.type}): Symptoms - ${pd.symptoms}. Treatment - ${pd.treatments.map(t => t.name).join(', ')}.`
    ).join(' ');
    
    procedure.push({
        step: 'Pest and Disease Management',
        description: `Monitor regularly for pests and diseases. ${pestDiseases}`
    });
    
    // Harvesting
    procedure.push({
        step: 'Harvesting',
        description: `Harvest after ${crop.harvesting.days_to_maturity.min}-${crop.harvesting.days_to_maturity.max} days from sowing. Indicators of maturity: ${crop.harvesting.indicators.join(', ')}. Method: ${crop.harvesting.method}. Expected yield: ${crop.harvesting.expected_yield.min}-${crop.harvesting.expected_yield.max} ${crop.harvesting.expected_yield.unit}.`
    });
    
    // Post-Harvest
    procedure.push({
        step: 'Post-Harvest Management',
        description: `Storage: ${crop.post_harvest.storage.method}. Conditions: ${crop.post_harvest.storage.conditions}. Shelf life: ${crop.post_harvest.storage.shelf_life}.`
    });
    
    return procedure;
}

module.exports = router;