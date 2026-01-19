/**
 * Google Price Service
 * Fetches crop prices from Google search results and agricultural APIs
 */

const axios = require('axios');
const { CropPriceData } = require('../models/cropPriceModel');

// Cache to store recent price fetches (in-memory cache)
const priceCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

// Base prices as fallback (per kg in INR)
const BASE_PRICES = {
    wheat: 25, rice: 35, corn: 20, tomato: 45,
    potato: 15, onion: 30, soybean: 55, cotton: 80,
    maize: 20, sugarcane: 35, groundnut: 60, mustard: 50,
    bajra: 22, jowar: 24, ragi: 30, pulses: 40,
    chilli: 120, turmeric: 80, ginger: 150, garlic: 200,
    brinjal: 30, okra: 40, cucumber: 25, carrot: 35,
    cabbage: 20, cauliflower: 30, beans: 60, peas: 80
};

/**
 * Fetch crop price from Google search results
 * @param {string} cropName - Name of the crop
 * @param {string} location - Location (optional, defaults to India)
 * @returns {Promise<number|null>} - Price per kg in INR, or null if not found
 */
async function fetchPriceFromGoogle(cropName, location = 'India') {
    try {
        // Check cache first
        const cacheKey = `${cropName.toLowerCase()}_${location}`;
        const cached = priceCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`Using cached price for ${cropName}: ₹${cached.price}/kg`);
            return cached.price;
        }

        // Search query for Google
        const searchQuery = `${cropName} price per kg ${location} today market rate`;
        
        // Use Google Custom Search API or scrape search results
        // For now, we'll use a combination of approaches
        
        // Try to fetch from Google Search (using a user-agent to avoid blocking)
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        
        // Method 1: Try Google Search API if available
        const googleApiKey = process.env.GOOGLE_API_KEY;
        const googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
        
        if (googleApiKey && googleSearchEngineId) {
            try {
                const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleSearchEngineId}&q=${encodeURIComponent(searchQuery)}`;
                const response = await axios.get(apiUrl, { timeout: 5000 });
                
                if (response.data && response.data.items && response.data.items.length > 0) {
                    const price = extractPriceFromSearchResults(response.data.items, cropName);
                    if (price) {
                        // Cache the result
                        priceCache.set(cacheKey, { price, timestamp: Date.now() });
                        return price;
                    }
                }
            } catch (apiError) {
                console.log('Google API not available, trying web scraping method');
            }
        }
        
        // Method 2: Try agricultural price APIs (if available)
        // You can add API keys for services like:
        // - Agmarknet (Government of India)
        // - Commodity Online
        // - Other agricultural price APIs
        
        // Method 3: Scrape Google search results page (as last resort)
        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&hl=en`;
        
        try {
            const response = await axios.get(googleSearchUrl, {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Cache-Control': 'max-age=0'
                },
                timeout: 10000,
                maxRedirects: 5
            });
            
            // Parse HTML response to extract price
            const html = response.data;
            const price = extractPriceFromHTML(html, cropName);
            
            if (price) {
                // Cache the result
                priceCache.set(cacheKey, { price, timestamp: Date.now() });
                
                // Also save to database for future reference
                try {
                    await CropPriceData.create({
                        crop_name: cropName,
                        location_id: 'LOC001',
                        price: price,
                        quantity: 1,
                        date: new Date(),
                        weather_features: {
                            temperature: 25,
                            humidity: 60,
                            rainfall: 0,
                            wind_speed: 10,
                            sunshine_hours: 8
                        }
                    });
                } catch (dbError) {
                    // Ignore database errors (duplicate entries, etc.)
                    console.log('Could not save price to database:', dbError.message);
                }
                
                return price;
            }
        } catch (scrapeError) {
            console.error('Error scraping Google:', scrapeError.message);
            // Google may block scraping, which is expected
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching price from Google:', error.message);
        return null;
    }
}

/**
 * Extract price from Google Search API results
 * @param {Array} items - Search result items
 * @param {string} cropName - Crop name
 * @returns {number|null} - Extracted price or null
 */
function extractPriceFromSearchResults(items, cropName) {
    for (const item of items) {
        const text = (item.title + ' ' + item.snippet).toLowerCase();
        
        // Look for price patterns: ₹XX, Rs.XX, INR XX, XX per kg, etc.
        const pricePatterns = [
            /₹\s*(\d+(?:\.\d+)?)\s*(?:per\s*kg|\/kg|per\s*kilogram)/i,
            /rs\.?\s*(\d+(?:\.\d+)?)\s*(?:per\s*kg|\/kg|per\s*kilogram)/i,
            /(\d+(?:\.\d+)?)\s*(?:rs|rupees?|inr)\s*(?:per\s*kg|\/kg|per\s*kilogram)/i,
            /price[:\s]+₹?\s*(\d+(?:\.\d+)?)\s*(?:per\s*kg|\/kg)/i,
            /market\s*rate[:\s]+₹?\s*(\d+(?:\.\d+)?)\s*(?:per\s*kg|\/kg)/i,
        ];
        
        for (const pattern of pricePatterns) {
            const match = text.match(pattern);
            if (match) {
                const price = parseFloat(match[1]);
                if (price > 0 && price < 1000) { // Reasonable price range per kg
                    return Math.round(price * 100) / 100;
                }
            }
        }
    }
    return null;
}

/**
 * Extract price from HTML content
 * @param {string} html - HTML content
 * @param {string} cropName - Crop name
 * @returns {number|null} - Extracted price or null
 */
function extractPriceFromHTML(html, cropName) {
    // Look for price patterns in HTML
    const pricePatterns = [
        /₹\s*(\d+(?:\.\d+)?)\s*(?:per\s*kg|\/kg|per\s*kilogram)/gi,
        /rs\.?\s*(\d+(?:\.\d+)?)\s*(?:per\s*kg|\/kg|per\s*kilogram)/gi,
        /(\d+(?:\.\d+)?)\s*(?:rs|rupees?|inr)\s*(?:per\s*kg|\/kg|per\s*kilogram)/gi,
        /price[:\s]+₹?\s*(\d+(?:\.\d+)?)\s*(?:per\s*kg|\/kg)/gi,
        /market\s*rate[:\s]+₹?\s*(\d+(?:\.\d+)?)\s*(?:per\s*kg|\/kg)/gi,
    ];
    
    const prices = [];
    
    for (const pattern of pricePatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            const price = parseFloat(match[1]);
            if (price > 0 && price < 1000) { // Reasonable price range per kg
                prices.push(price);
            }
        }
    }
    
    if (prices.length > 0) {
        // Return average of found prices, or most common price
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        return Math.round(avgPrice * 100) / 100;
    }
    
    return null;
}

/**
 * Get market price with fallback
 * @param {string} cropName - Crop name
 * @param {string} location - Location (optional)
 * @returns {Promise<number>} - Market price per kg
 */
async function getMarketPrice(cropName, location = 'India') {
    // First try to get from database (recent prices)
    try {
        const recentPrice = await CropPriceData.findOne({
            crop_name: cropName.toLowerCase(),
            date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }).sort({ date: -1 });
        
        if (recentPrice && recentPrice.price) {
            console.log(`Using recent database price for ${cropName}: ₹${recentPrice.price}/kg`);
            return recentPrice.price;
        }
    } catch (dbError) {
        console.log('Error fetching from database:', dbError.message);
    }
    
    // Try to fetch from Google
    const googlePrice = await fetchPriceFromGoogle(cropName, location);
    if (googlePrice) {
        return googlePrice;
    }
    
    // Fallback to base prices
    const normalizedCropName = cropName.toLowerCase();
    return BASE_PRICES[normalizedCropName] || 30;
}

module.exports = {
    fetchPriceFromGoogle,
    getMarketPrice,
    extractPriceFromSearchResults,
    extractPriceFromHTML
};
