const express = require('express');
const router = express.Router();
const Crop = require('../../models/cropModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// GET all crops with optional filtering
router.get('/', async (req, res) => {
    try {
        const { 
            category,
            climate_zone,
            sow_month,
            soil_type,
            drought_tolerance,
            search,
            page = 1,
            limit = 20,
            sortBy = 'name'
        } = req.query;

        const query = {};

        if (category && category !== 'all') {
            query.categories = category;
        }

        if (climate_zone) {
            query['climate_zones.zone_name'] = { $regex: climate_zone, $options: 'i' };
        }

        if (sow_month) {
            const m = parseInt(sow_month);
            if (!isNaN(m)) {
                query.$and = [
                    { 'climate_zones.sowing_window.start_month': { $lte: m } },
                    { 'climate_zones.sowing_window.end_month': { $gte: m } }
                ];
            }
        }

        if (soil_type) {
            query['soil_requirements.soil_types'] = soil_type;
        }

        if (drought_tolerance) {
            query['water_requirements.drought_tolerance'] = drought_tolerance;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { scientific_name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const pageNum = Math.max(1, parseInt(page));
        const pageSize = Math.min(100, Math.max(1, parseInt(limit)));

        const sort = {};
        if (sortBy) {
            const dir = sortBy.startsWith('-') ? -1 : 1;
            const field = sortBy.replace(/^[-+]/, '');
            sort[field] = dir;
        } else {
            sort.name = 1;
        }

        const [crops, total] = await Promise.all([
            Crop.find(query).sort(sort).skip((pageNum - 1) * pageSize).limit(pageSize),
            Crop.countDocuments(query)
        ]);

        res.json({
            success: true,
            page: pageNum,
            limit: pageSize,
            total,
            count: crops.length,
            crops
        });
    } catch (error) {
        console.error('Error fetching crops:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch crops',
            error: error.message
        });
    }
});

// GET a single crop by ID
router.get('/:id', async (req, res) => {
    try {
        const crop = await Crop.findById(req.params.id);
        
        if (!crop) {
            return res.status(404).json({
                success: false,
                message: 'Crop not found'
            });
        }
        
        res.json({
            success: true,
            crop
        });
    } catch (error) {
        console.error('Error fetching crop:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch crop',
            error: error.message
        });
    }
});

// POST generate crop recommendations
router.post('/recommend', async (req, res) => {
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
            crop_id // Optional - if user wants recommendation for a specific crop
        } = req.body;
        
        // If crop_id is provided, return recommendation for that specific crop
        if (crop_id) {
            const crop = await Crop.findById(crop_id);
            
            if (!crop) {
                return res.status(404).json({
                    success: false,
                    message: 'Crop not found'
                });
            }
            
            // Generate recommendation for this specific crop
            const recommendation = await crop.generateRecommendation({
                location,
                soil_type,
                ph,
                rainfall,
                plot_size,
                season,
                budget_level,
                risk_preference
            });
            
            return res.json({
                success: true,
                recommendations: [recommendation]
            });
        }
        
        // Build query for finding suitable crops
        const query = {};
        
        if (soil_type) {
            query.soil_types = soil_type;
        }
        
        if (ph) {
            query['ph_range.min'] = { $lte: parseFloat(ph) };
            query['ph_range.max'] = { $gte: parseFloat(ph) };
        }
        
        if (season) {
            query.growing_seasons = season;
        }
        
        // Find crops matching the basic criteria
        const potentialCrops = await Crop.find(query);
        
        if (potentialCrops.length === 0) {
            return res.json({
                success: true,
                message: 'No crops match your criteria',
                recommendations: []
            });
        }
        
        // Generate recommendations for each potential crop
        const recommendations = await Promise.all(
            potentialCrops.map(crop => 
                crop.generateRecommendation({
                    location,
                    soil_type,
                    ph,
                    rainfall,
                    plot_size,
                    season,
                    budget_level,
                    risk_preference
                })
            )
        );
        
        // Sort recommendations by score (highest first)
        const sortedRecommendations = recommendations
            .filter(rec => rec.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // Return top 10 recommendations
        
        res.json({
            success: true,
            count: sortedRecommendations.length,
            recommendations: sortedRecommendations
        });
    } catch (error) {
        console.error('Error generating recommendations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate recommendations',
            error: error.message
        });
    }
});

// GET generate PDF for a crop
router.get('/:id/pdf', async (req, res) => {
    try {
        const crop = await Crop.findById(req.params.id);
        
        if (!crop) {
            return res.status(404).json({
                success: false,
                message: 'Crop not found'
            });
        }
        
        // Create a PDF document
        const doc = new PDFDocument({ margin: 50 });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${crop.name.replace(/\s+/g, '_')}_guide.pdf`);
        
        // Pipe the PDF to the response
        doc.pipe(res);
        
        // Add content to the PDF
        doc.fontSize(25).text(`${crop.name} Growing Guide`, { align: 'center' });
        doc.fontSize(15).text(`Scientific Name: ${crop.scientific_name || 'N/A'}`, { align: 'center' });
        
        doc.moveDown();
        doc.fontSize(12).text(crop.description);
        
        doc.moveDown();
        doc.fontSize(18).text('Growing Conditions');
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Climate Zones: ${crop.climate_zones.join(', ')}`);
        doc.fontSize(12).text(`Soil Types: ${crop.soil_types.join(', ')}`);
        doc.fontSize(12).text(`pH Range: ${crop.ph_range.min} - ${crop.ph_range.max}`);
        doc.fontSize(12).text(`Water Need: ${crop.water_need}`);
        doc.fontSize(12).text(`Growing Seasons: ${crop.growing_seasons.join(', ')}`);
        
        doc.moveDown();
        doc.fontSize(18).text('Crop Details');
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Days to Maturity: ${crop.days_to_maturity.min} - ${crop.days_to_maturity.max} days`);
        doc.fontSize(12).text(`Expected Yield: ${crop.expected_yield.min} - ${crop.expected_yield.max} ${crop.expected_yield.unit}`);
        doc.fontSize(12).text(`Seed Rate: ${crop.planting_details.seed_rate.value} ${crop.planting_details.seed_rate.unit}`);
        doc.fontSize(12).text(`Spacing: Row to Row: ${crop.planting_details.spacing.row_to_row.value}${crop.planting_details.spacing.row_to_row.unit}, Plant to Plant: ${crop.planting_details.spacing.plant_to_plant.value}${crop.planting_details.spacing.plant_to_plant.unit}`);
        doc.fontSize(12).text(`Planting Depth: ${crop.planting_details.depth.value} ${crop.planting_details.depth.unit}`);
        
        doc.moveDown();
        doc.fontSize(18).text('Complete Growing Procedure');
        doc.moveDown(0.5);
        
        crop.procedure.forEach((step, index) => {
            doc.fontSize(14).text(`${index + 1}. ${step.step}`);
            doc.fontSize(12).text(step.description);
            
            if (step.tips && step.tips.length > 0) {
                doc.fontSize(12).text('Tips:');
                step.tips.forEach(tip => {
                    doc.fontSize(12).text(`• ${tip}`);
                });
            }
            
            doc.moveDown(0.5);
        });
        
        doc.moveDown();
        doc.fontSize(18).text('Common Pests & Diseases');
        doc.moveDown(0.5);
        
        crop.pest_disease_profile.forEach(item => {
            doc.fontSize(14).text(`${item.name} (${item.type})`);
            doc.fontSize(12).text(`Symptoms: ${item.symptoms.join(', ')}`);
            doc.fontSize(12).text('Control Measures:');
            
            item.control_measures.forEach(measure => {
                doc.fontSize(12).text(`• ${measure}`);
            });
            
            doc.moveDown(0.5);
        });
        
        // Finalize the PDF
        doc.end();
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate PDF',
            error: error.message
        });
    }
});

// POST create a new crop (admin only)
router.post('/', async (req, res) => {
    try {
        // Check if user is admin (middleware should be added)
        
        const newCrop = new Crop(req.body);
        await newCrop.save();
        
        res.status(201).json({
            success: true,
            message: 'Crop created successfully',
            crop: newCrop
        });
    } catch (error) {
        console.error('Error creating crop:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create crop',
            error: error.message
        });
    }
});

// PUT update a crop (admin only)
router.put('/:id', async (req, res) => {
    try {
        // Check if user is admin (middleware should be added)
        
        const updatedCrop = await Crop.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!updatedCrop) {
            return res.status(404).json({
                success: false,
                message: 'Crop not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Crop updated successfully',
            crop: updatedCrop
        });
    } catch (error) {
        console.error('Error updating crop:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update crop',
            error: error.message
        });
    }
});

// DELETE a crop (admin only)
router.delete('/:id', async (req, res) => {
    try {
        // Check if user is admin (middleware should be added)
        
        const deletedCrop = await Crop.findByIdAndDelete(req.params.id);
        
        if (!deletedCrop) {
            return res.status(404).json({
                success: false,
                message: 'Crop not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Crop deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting crop:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete crop',
            error: error.message
        });
    }
});

module.exports = router;