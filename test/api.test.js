const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app'); // We'll need to export app from app.js

// Mock data
const mockFarmer = {
    username: 'testfarmer',
    email: 'farmer@test.com',
    password: 'TestPass123!',
    location: 'Test Location'
};

const mockPricePredictionRequest = {
    crop_name: 'wheat',
    location_id: 'LOC001',
    quantity: 100,
    weather_forecast: {
        temperature: 25,
        humidity: 60,
        rainfall: 10,
        wind_speed: 15,
        sunshine_hours: 8
    }
};

const mockFertilizerRequest = {
    crop_name: 'wheat',
    soil_type: 'loamy',
    soil_ph: 7.0,
    organic_matter: 2.5,
    nitrogen: 50,
    phosphorus: 30,
    potassium: 40
};

describe('CropConnect API Tests', () => {
    let mongoServer;
    let authenticatedAgent;

    beforeAll(async () => {
        // Start in-memory MongoDB instance
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        // Connect to the in-memory database
        await mongoose.connect(mongoUri);
        
        // Create authenticated agent for testing protected routes
        authenticatedAgent = request.agent(app);
    });

    afterAll(async () => {
        // Clean up
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Clean database before each test
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
    });

    describe('Authentication', () => {
        test('should register a new farmer', async () => {
            const response = await request(app)
                .post('/users/signupfarmer')
                .send(mockFarmer);

            expect(response.status).toBe(302); // Redirect after successful registration
        });

        test('should login a farmer', async () => {
            // First register a farmer
            await request(app)
                .post('/users/signupfarmer')
                .send(mockFarmer);

            // Then login
            const response = await authenticatedAgent
                .post('/users/loginfarmer')
                .send({
                    username: mockFarmer.username,
                    password: mockFarmer.password
                });

            expect(response.status).toBe(302); // Redirect after successful login
        });

        test('should reject login with invalid credentials', async () => {
            const response = await request(app)
                .post('/users/loginfarmer')
                .send({
                    username: 'nonexistent',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(302); // Redirect to signup on failure
        });
    });

    describe('Price Prediction API', () => {
        beforeEach(async () => {
            // Register and login farmer for authenticated tests
            await request(app)
                .post('/users/signupfarmer')
                .send(mockFarmer);

            await authenticatedAgent
                .post('/users/loginfarmer')
                .send({
                    username: mockFarmer.username,
                    password: mockFarmer.password
                });
        });

        test('should predict crop price with valid data', async () => {
            const response = await authenticatedAgent
                .post('/api/predict-price')
                .send(mockPricePredictionRequest);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('predicted_price');
            expect(response.body.data).toHaveProperty('crop', 'wheat');
            expect(response.body.data).toHaveProperty('confidence_interval');
            expect(response.body.data.predicted_price).toBeGreaterThan(0);
        });

        test('should reject prediction request without crop_name', async () => {
            const invalidRequest = { ...mockPricePredictionRequest };
            delete invalidRequest.crop_name;

            const response = await authenticatedAgent
                .post('/api/predict-price')
                .send(invalidRequest);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('crop_name is required');
        });

        test('should reject prediction request with invalid crop', async () => {
            const invalidRequest = {
                ...mockPricePredictionRequest,
                crop_name: 'invalid_crop'
            };

            const response = await authenticatedAgent
                .post('/api/predict-price')
                .send(invalidRequest);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Invalid crop name');
        });

        test('should require authentication for price prediction', async () => {
            const response = await request(app)
                .post('/api/predict-price')
                .send(mockPricePredictionRequest);

            expect(response.status).toBe(302); // Redirect to login
        });
    });

    describe('Fertilizer Recommendation API', () => {
        beforeEach(async () => {
            // Register and login farmer for authenticated tests
            await request(app)
                .post('/users/signupfarmer')
                .send(mockFarmer);

            await authenticatedAgent
                .post('/users/loginfarmer')
                .send({
                    username: mockFarmer.username,
                    password: mockFarmer.password
                });
        });

        test('should provide fertilizer recommendations with valid data', async () => {
            const response = await authenticatedAgent
                .post('/api/recommend-fertilizer')
                .send(mockFertilizerRequest);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('fertilizer_recommendations');
            expect(response.body.data).toHaveProperty('nutrient_status');
            expect(response.body.data).toHaveProperty('crop', 'wheat');
            expect(Array.isArray(response.body.data.fertilizer_recommendations)).toBe(true);
        });

        test('should reject fertilizer request without crop_name', async () => {
            const invalidRequest = { ...mockFertilizerRequest };
            delete invalidRequest.crop_name;

            const response = await authenticatedAgent
                .post('/api/recommend-fertilizer')
                .send(invalidRequest);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('crop_name is required');
        });

        test('should handle nutrient deficiency correctly', async () => {
            const lowNutrientRequest = {
                ...mockFertilizerRequest,
                nitrogen: 20,  // Very low nitrogen
                phosphorus: 10, // Very low phosphorus
                potassium: 15   // Very low potassium
            };

            const response = await authenticatedAgent
                .post('/api/recommend-fertilizer')
                .send(lowNutrientRequest);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.fertilizer_recommendations.length).toBeGreaterThan(0);
            
            // Check that recommendations are provided for deficient nutrients
            const recommendations = response.body.data.fertilizer_recommendations;
            const nutrients = recommendations.map(r => r.nutrient);
            expect(nutrients).toContain('NITROGEN');
            expect(nutrients).toContain('PHOSPHORUS');
            expect(nutrients).toContain('POTASSIUM');
        });

        test('should handle excess nutrients correctly', async () => {
            const highNutrientRequest = {
                ...mockFertilizerRequest,
                nitrogen: 200,  // Excess nitrogen
                phosphorus: 100, // Excess phosphorus
                potassium: 80    // Excess potassium
            };

            const response = await authenticatedAgent
                .post('/api/recommend-fertilizer')
                .send(highNutrientRequest);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            // Should have fewer or no recommendations due to excess nutrients
            const nutrientStatus = response.body.data.nutrient_status;
            expect(nutrientStatus.nitrogen.status).toBe('excess');
            expect(nutrientStatus.phosphorus.status).toBe('excess');
        });

        test('should require authentication for fertilizer recommendations', async () => {
            const response = await request(app)
                .post('/api/recommend-fertilizer')
                .send(mockFertilizerRequest);

            expect(response.status).toBe(302); // Redirect to login
        });
    });

    describe('API History Endpoints', () => {
        beforeEach(async () => {
            // Register and login farmer for authenticated tests
            await request(app)
                .post('/users/signupfarmer')
                .send(mockFarmer);

            await authenticatedAgent
                .post('/users/loginfarmer')
                .send({
                    username: mockFarmer.username,
                    password: mockFarmer.password
                });
        });

        test('should get prediction history', async () => {
            // First make a prediction to have history
            await authenticatedAgent
                .post('/api/predict-price')
                .send(mockPricePredictionRequest);

            const response = await authenticatedAgent
                .get('/api/predictions');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        test('should get fertilizer history', async () => {
            // First make a recommendation to have history
            await authenticatedAgent
                .post('/api/recommend-fertilizer')
                .send(mockFertilizerRequest);

            const response = await authenticatedAgent
                .get('/api/fertilizer-history');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        test('should return empty history for new users', async () => {
            const response = await authenticatedAgent
                .get('/api/predictions');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBe(0);
        });
    });

    describe('Input Validation', () => {
        beforeEach(async () => {
            // Register and login farmer for authenticated tests
            await request(app)
                .post('/users/signupfarmer')
                .send(mockFarmer);

            await authenticatedAgent
                .post('/users/loginfarmer')
                .send({
                    username: mockFarmer.username,
                    password: mockFarmer.password
                });
        });

        test('should validate weather forecast ranges', async () => {
            const invalidWeatherRequest = {
                ...mockPricePredictionRequest,
                weather_forecast: {
                    temperature: 60, // Too high
                    humidity: 150,   // Over 100%
                    rainfall: -5,    // Negative
                    wind_speed: -10, // Negative
                    sunshine_hours: 30 // More than 24 hours
                }
            };

            const response = await authenticatedAgent
                .post('/api/predict-price')
                .send(invalidWeatherRequest);

            // Should still process but use default values or bounds
            expect(response.status).toBe(200);
        });

        test('should validate soil pH ranges', async () => {
            const invalidSoilRequest = {
                ...mockFertilizerRequest,
                soil_ph: 15, // Invalid pH
                organic_matter: -1, // Negative
                nitrogen: -10, // Negative
                phosphorus: -5, // Negative
                potassium: -3  // Negative
            };

            const response = await authenticatedAgent
                .post('/api/recommend-fertilizer')
                .send(invalidSoilRequest);

            // The API should handle invalid ranges gracefully
            expect(response.status).toBe(200);
        });
    });

    describe('Edge Cases', () => {
        beforeEach(async () => {
            await request(app)
                .post('/users/signupfarmer')
                .send(mockFarmer);

            await authenticatedAgent
                .post('/users/loginfarmer')
                .send({
                    username: mockFarmer.username,
                    password: mockFarmer.password
                });
        });

        test('should handle minimal request data', async () => {
            const minimalRequest = {
                crop_name: 'rice'
            };

            const response = await authenticatedAgent
                .post('/api/predict-price')
                .send(minimalRequest);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.predicted_price).toBeGreaterThan(0);
        });

        test('should handle empty weather forecast', async () => {
            const emptyWeatherRequest = {
                crop_name: 'corn',
                weather_forecast: {}
            };

            const response = await authenticatedAgent
                .post('/api/predict-price')
                .send(emptyWeatherRequest);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.weather_factors).toBeDefined();
        });

        test('should handle optimal nutrient levels', async () => {
            const optimalRequest = {
                ...mockFertilizerRequest,
                nitrogen: 120,    // Optimal for wheat
                phosphorus: 60,   // Optimal for wheat
                potassium: 40     // Optimal for wheat
            };

            const response = await authenticatedAgent
                .post('/api/recommend-fertilizer')
                .send(optimalRequest);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            const nutrientStatus = response.body.data.nutrient_status;
            expect(nutrientStatus.nitrogen.status).toBe('optimal');
            expect(nutrientStatus.phosphorus.status).toBe('optimal');
            expect(nutrientStatus.potassium.status).toBe('optimal');
        });
    });
});

module.exports = {
    mockFarmer,
    mockPricePredictionRequest,
    mockFertilizerRequest
};