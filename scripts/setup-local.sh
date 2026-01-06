#!/bin/bash

# CropConnect Local Development Setup Script
# This script sets up the entire CropConnect application for local development

echo "🌾 CropConnect Local Setup Starting..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python 3.9+ first."
    exit 1
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Node.js dependencies"
    exit 1
fi

# Install Python ML dependencies
echo "🐍 Installing Python ML dependencies..."
pip3 install -r ml/requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

# Create directories for ML models and data
echo "📁 Creating ML directories..."
mkdir -p ml/models ml/data

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚙️  Creating .env template..."
    cat > .env << EOL
# Database - Replace with your MongoDB Atlas connection string
ATLASDB_URL=mongodb+srv://username:password@cluster.mongodb.net/cropconnect

# Security - Change this to a secure random string
SESSION_SECRET=super-secret-session-key-change-this-please-minimum-32-chars

# Environment
NODE_ENV=development

# External Services - Add your tokens
MAP_TOKEN=your-mapbox-access-token-here
ML_SERVICE_URL=http://localhost:5001
ML_API_KEY=your-ml-api-key-here

# Optional
PORT=8080
EOL
    echo "📝 Created .env template. Please update it with your actual values:"
    echo "   1. MongoDB Atlas connection string"
    echo "   2. Mapbox access token"
    echo "   3. Secure session secret"
fi

# Generate synthetic ML training data
echo "🤖 Generating synthetic ML training data..."
python3 ml/data/synthetic_data_generator.py

if [ $? -eq 0 ]; then
    echo "✅ Successfully generated synthetic data"
else
    echo "⚠️  Warning: Failed to generate synthetic data. ML features may not work."
fi

# Train the ML model
echo "🧠 Training ML model..."
python3 ml/training/train_price_model.py

if [ $? -eq 0 ]; then
    echo "✅ Successfully trained ML model"
else
    echo "⚠️  Warning: Failed to train ML model. Will use fallback calculations."
fi

# Run tests to verify setup
echo "🧪 Running tests to verify setup..."
npm test

if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "⚠️  Some tests failed. Check the output above for details."
fi

echo ""
echo "🎉 Setup completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Update your .env file with real values"
echo "   2. Set up MongoDB Atlas database"
echo "   3. Get a Mapbox access token"
echo "   4. Run 'npm start' to start the application"
echo ""
echo "🔗 Useful commands:"
echo "   npm start          - Start the application"
echo "   npm run dev        - Start with auto-reload"
echo "   npm test           - Run tests"
echo "   npm run train-ml   - Retrain ML model"
echo ""
echo "🌐 Once running, visit: http://localhost:8080"
echo ""
echo "📚 Documentation:"
echo "   README_UPDATED.md           - Complete setup guide"
echo "   docs/api-documentation.md   - API reference"
echo "   docs/deployment-checklist.md - Deployment guide"