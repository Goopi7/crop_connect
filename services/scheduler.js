const cron = require('node-cron');
const priceFetcher = require('./priceFetcher');

// Initialize the scheduler
function initScheduler() {
    // Schedule price updates to run daily at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('Running scheduled price update...');
        try {
            const result = await priceFetcher.updatePrices();
            console.log(`Price update completed: ${result.updateCount} updated, ${result.newCount} new records`);
        } catch (error) {
            console.error('Scheduled price update failed:', error);
        }
    });

    console.log('Price update scheduler initialized');
}

module.exports = { initScheduler };