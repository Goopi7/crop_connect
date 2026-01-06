/**
 * Price Fetcher Service
 * Handles fetching and updating crop prices from external sources
 */

const CropPrice = require('../models/cropPriceModel');

/**
 * Update crop prices from external sources or APIs
 * @returns {Object} Result with counts of updated and new records
 */
async function updatePrices() {
    try {
        console.log('Starting price update process');
        
        // This would typically fetch data from external APIs
        // For now, we'll simulate by updating random prices for existing crops
        
        // Get all existing crop prices
        const existingPrices = await CropPrice.find({});
        let updateCount = 0;
        let newCount = 0;
        
        // If we have existing prices, update them with slight variations
        if (existingPrices && existingPrices.length > 0) {
            for (const price of existingPrices) {
                // Generate a random price fluctuation between -5% and +5%
                const fluctuation = 1 + ((Math.random() * 10) - 5) / 100;
                const newPrice = Math.round(price.price * fluctuation * 100) / 100;
                
                // Update the price
                await CropPrice.findByIdAndUpdate(price._id, {
                    price: newPrice,
                    last_updated: new Date()
                });
                updateCount++;
            }
        } else {
            // If no prices exist yet, create some default ones
            const defaultCrops = ['Wheat', 'Rice', 'Maize', 'Potato', 'Tomato', 'Cotton'];
            const defaultPrices = [
                { min: 1800, max: 2200 },  // Wheat (per quintal)
                { min: 1900, max: 2400 },  // Rice (per quintal)
                { min: 1700, max: 2100 },  // Maize (per quintal)
                { min: 1000, max: 1500 },  // Potato (per quintal)
                { min: 1500, max: 2500 },  // Tomato (per quintal)
                { min: 5000, max: 6000 }   // Cotton (per quintal)
            ];
            
            for (let i = 0; i < defaultCrops.length; i++) {
                const randomPrice = Math.floor(
                    defaultPrices[i].min + 
                    Math.random() * (defaultPrices[i].max - defaultPrices[i].min)
                );
                
                await CropPrice.create({
                    crop_name: defaultCrops[i],
                    price: randomPrice,
                    unit: 'quintal',
                    market: 'National Average',
                    last_updated: new Date()
                });
                newCount++;
            }
        }
        
        return { updateCount, newCount };
    } catch (error) {
        console.error('Error updating prices:', error);
        throw error;
    }
}

module.exports = {
    updatePrices
};