const { MongoMemoryServer } = require('mongodb-memory-server');

// Increase timeout for async operations
jest.setTimeout(30000);

// Mock console methods to reduce test noise
beforeAll(() => {
    global.console = {
        ...console,
        // Suppress console.log in tests
        log: process.env.NODE_ENV === 'test' ? jest.fn() : console.log,
        debug: jest.fn(),
        info: jest.fn(),
        warn: console.warn,
        error: console.error,
    };
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SECRET = 'test-secret-key';
process.env.ML_SERVICE_URL = 'http://localhost:5001';

// Mock external services if needed
beforeAll(() => {
    // Mock Mapbox geocoding if needed
    jest.mock('@mapbox/mapbox-sdk/services/geocoding', () => {
        return jest.fn(() => ({
            forwardGeocode: jest.fn(() => ({
                send: jest.fn(() => Promise.resolve({
                    body: {
                        features: [{
                            geometry: {
                                type: 'Point',
                                coordinates: [77.5946, 12.9716] // Bangalore coordinates
                            }
                        }]
                    }
                }))
            }))
        }));
    });
});

afterAll(async () => {
    // Clean up any remaining connections
    await new Promise(resolve => setTimeout(resolve, 1000));
});