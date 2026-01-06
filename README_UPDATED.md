# 🌾 CropConnect - Farmer-to-Buyer Crop Trading Platform

**CropConnect** is a comprehensive full-stack web application that connects **farmers** with **buyers** to facilitate transparent and location-based crop trade. It includes real-time map interactions, buyer requests, ML-powered crop price predictions, fertilizer recommendations, and clean UI interfaces tailored for each user type.

🔗 **Live Demo:** https://crop-connect-t0qz.onrender.com/

---

## 🚀 New Features (Enhanced Version)

### 🤖 Machine Learning Capabilities
- **Crop Price Prediction API** - Predict future crop prices based on weather and market factors
- **Fertilizer Recommendation System** - AI-powered soil analysis and fertilizer suggestions
- **Historical Data Analytics** - Track prediction accuracy and recommendations

### 🔒 Enhanced Security
- **Advanced Authentication** - Secure password hashing with bcrypt
- **Rate Limiting** - API protection against abuse
- **Input Sanitization** - XSS and injection attack prevention
- **Security Headers** - Helmet.js for production security

### ✅ Testing & Quality
- **Comprehensive Unit Tests** - Jest-based testing suite
- **API Integration Tests** - Automated endpoint testing
- **Code Coverage Reports** - Track test coverage metrics

### 🚀 Production Ready
- **Docker Support** - Containerized deployment
- **Multi-platform Deployment** - Render, Heroku, Vercel guides
- **Environment Configuration** - Production-ready security settings
- **Health Monitoring** - Application health checks

---

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript, EJS  
- **Backend**: Node.js, Express.js  
- **Database**: MongoDB with Mongoose  
- **Map Integration**: Mapbox GL JS  
- **Authentication**: Express-session and Passport  
- **ML/AI**: Python (scikit-learn, pandas, numpy)
- **Security**: Helmet, bcrypt, express-rate-limit
- **Testing**: Jest, Supertest
- **DevOps**: Docker, Docker Compose

---

## 🧑‍💻 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.9+
- MongoDB Atlas account (free tier available)
- Mapbox account with API token

### 1. Clone the Repository
```bash
git clone https://github.com/BaadeVamshi/Crop_Connect.git
cd Crop_Connect
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python ML dependencies
pip install -r ml/requirements.txt
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
# Database
ATLASDB_URL=mongodb+srv://username:password@cluster.mongodb.net/cropconnect

# Security
SESSION_SECRET=your-super-secret-session-key-minimum-32-characters
NODE_ENV=development

# External Services  
MAP_TOKEN=your-mapbox-access-token
ML_SERVICE_URL=http://localhost:5001
ML_API_KEY=your-ml-api-key

# Optional
PORT=8080
```

### 4. Setup MongoDB Atlas
1. Create a [MongoDB Atlas](https://www.mongodb.com/atlas) account
2. Create a new cluster (free tier available)
3. Create a database user with read/write permissions
4. Get your connection string and add it to `.env`

### 5. Setup Mapbox
1. Create a [Mapbox](https://www.mapbox.com/) account  
2. Get your access token from the dashboard
3. Add the token to your `.env` file

### 6. Initialize ML Models (Optional)
```bash
# Generate synthetic training data
npm run generate-data

# Train the ML model
npm run train-ml
```

### 7. Run the Application
```bash
# Development mode with auto-reload
npm run dev

# Or standard mode
npm start
```

Visit `http://localhost:8080` to access the application.

---

## 🤖 Machine Learning Features

### Crop Price Prediction
The application includes an advanced ML pipeline for predicting crop prices:

**Features:**
- Weather-based price forecasting
- Historical data analysis
- Confidence intervals
- Multiple crop support

**API Endpoint:**
```bash
POST /api/predict-price
```

**Example Request:**
```json
{
  "crop_name": "wheat",
  "location_id": "LOC001",
  "quantity": 100,
  "weather_forecast": {
    "temperature": 25,
    "humidity": 60,
    "rainfall": 10,
    "wind_speed": 15,
    "sunshine_hours": 8
  }
}
```

### Fertilizer Recommendations
Intelligent fertilizer recommendations based on soil analysis:

**Features:**
- Soil nutrient analysis
- Crop-specific recommendations
- pH adjustment advice
- Organic matter suggestions

**API Endpoint:**
```bash
POST /api/recommend-fertilizer
```

**Example Request:**
```json
{
  "crop_name": "wheat",
  "soil_ph": 6.5,
  "nitrogen": 45,
  "phosphorus": 25,
  "potassium": 35
}
```

### ML Model Training

**Generate Synthetic Data:**
```bash
python ml/data/synthetic_data_generator.py
```

**Train Models:**
```bash
python ml/training/train_price_model.py
```

**Model Files Location:**
- `ml/models/crop_price_model.pkl` - Trained Random Forest model
- `ml/models/scalers.pkl` - Feature scaling parameters
- `ml/models/encoders.pkl` - Categorical encoding parameters

---

## 🧪 Testing

### Run Unit Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage
The test suite covers:
- API endpoint functionality
- Authentication flows
- ML prediction accuracy
- Input validation
- Error handling

### Manual API Testing
```bash
# Test price prediction (requires authentication)
curl -X POST http://localhost:8080/api/predict-price \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"crop_name": "wheat"}'

# Test fertilizer recommendation
curl -X POST http://localhost:8080/api/recommend-fertilizer \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"crop_name": "wheat", "soil_ph": 6.5}'
```

---

## 🚀 Deployment

### Docker Deployment (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t cropconnect .
docker run -p 8080:8080 --env-file .env cropconnect
```

### Platform-Specific Deployment

#### Render
1. Connect your GitHub repository
2. Set build command: `npm install && pip install -r ml/requirements.txt`
3. Set start command: `node app.js`
4. Add environment variables from your `.env` file

#### Heroku
```bash
heroku create your-app-name
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add heroku/python
heroku config:set NODE_ENV=production
# Add other environment variables
git push heroku main
```

#### Vercel
```bash
npm install -g vercel
vercel --prod
# Configure environment variables in Vercel dashboard
```

**📋 Detailed deployment instructions:** [docs/deployment-checklist.md](docs/deployment-checklist.md)

---

## 📚 API Documentation

### Authentication
All API endpoints require user authentication via session cookies.

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/predict-price` | Predict crop prices |
| POST | `/api/recommend-fertilizer` | Get fertilizer recommendations |
| GET | `/api/predictions` | Get prediction history |
| GET | `/api/fertilizer-history` | Get recommendation history |

### Response Format
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Handling
```json
{
  "success": false,
  "error": "Error description"
}
```

**📖 Complete API Documentation:** [docs/api-documentation.md](docs/api-documentation.md)

---

## 🗂️ Project Structure

```
Crop_Connect/
├── models/                 # MongoDB schemas
│   ├── loginFarmer.js     # Farmer authentication model
│   ├── cropPriceModel.js  # Price prediction models
│   └── fertilizerModel.js # Fertilizer recommendation models
├── routes/                # API routes
│   └── api.js             # ML API endpoints
├── middleware/            # Custom middleware
│   └── security.js        # Security and authentication
├── ml/                    # Machine Learning pipeline
│   ├── data/              # Data generation and processing
│   ├── training/          # Model training scripts
│   ├── models/            # Trained models (generated)
│   └── requirements.txt   # Python dependencies
├── test/                  # Test suites
│   ├── api.test.js        # API endpoint tests
│   └── setup.js           # Test configuration
├── views/                 # EJS templates
├── public/                # Static assets
├── docs/                  # Documentation
│   ├── api-documentation.md
│   └── deployment-checklist.md
├── docker-compose.yml     # Multi-container setup
├── Dockerfile            # Container configuration
├── jest.config.js        # Test configuration
└── app.js                # Main application entry
```

---

## 🔐 Security Features

### Authentication & Authorization
- Secure session management with express-session
- Password hashing with bcrypt
- Role-based access control (Farmer/Buyer)
- Session timeout and secure cookies

### API Protection
- Rate limiting (100 requests/15min general, 10 requests/min ML)
- Input sanitization and validation
- CORS configuration
- Security headers with Helmet.js

### Data Security
- MongoDB Atlas with authentication
- Environment variable protection
- No sensitive data in logs
- Secure cookie configuration

---

## 📊 Monitoring & Analytics

### Health Checks
```bash
# Application health
GET /health

# Response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production",
  "version": "1.0.0"
}
```

### Logging
- Request/response logging
- Error tracking
- Performance monitoring
- Security event logging

---

## 🤝 Contributing

### Development Setup
```bash
# Fork and clone the repository
git clone https://github.com/yourusername/Crop_Connect.git

# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes and test
npm test

# Commit and push
git commit -m "Add your feature"
git push origin feature/your-feature-name
```

### Code Standards
- Use consistent formatting (Prettier recommended)
- Write unit tests for new features
- Follow existing patterns and conventions
- Update documentation for API changes

---

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check your MongoDB Atlas connection string
# Verify network access settings in Atlas
# Ensure database user has proper permissions
```

**ML Model Errors**
```bash
# Ensure Python dependencies are installed
pip install -r ml/requirements.txt

# Check if model files exist
ls ml/models/

# Regenerate models if needed
npm run train-ml
```

**Authentication Issues**
```bash
# Verify SESSION_SECRET is set
echo $SESSION_SECRET

# Check if users collection exists in MongoDB
# Clear browser cookies and try again
```

**API Rate Limiting**
```bash
# Wait for rate limit to reset (15 minutes for general API)
# Check rate limit headers in response
# Use different IP or implement exponential backoff
```

---

## 📈 Performance Optimization

### Database
- Indexed queries for fast lookups
- Connection pooling
- Query optimization

### Caching
- Session caching with MongoDB
- Static asset optimization
- Optional Redis integration for ML predictions

### ML Performance
- Model caching in memory
- Fallback calculations when ML service unavailable
- Optimized feature preprocessing

---

## 🔄 Version History

### v2.0.0 (Current)
- ✅ ML-powered price predictions
- ✅ Fertilizer recommendation system
- ✅ Enhanced security features
- ✅ Comprehensive testing suite
- ✅ Docker deployment support
- ✅ Production-ready configuration

### v1.0.0 (Original)
- Basic farmer-buyer platform
- Location-based matching
- Request management system
- Mapbox integration

---

## 📞 Support

### Documentation
- [API Documentation](docs/api-documentation.md)
- [Deployment Guide](docs/deployment-checklist.md)

### Contact
- **GitHub Issues**: [Report bugs or request features](https://github.com/BaadeVamshi/Crop_Connect/issues)
- **Email**: [Your contact email]
- **Discord**: [Community server link]

### FAQ

**Q: How accurate are the ML predictions?**
A: The current model achieves ~85% accuracy on synthetic data. Accuracy will improve with real-world data collection.

**Q: Can I add new crops to the system?**  
A: Yes, update the crop enum in models and retrain the ML model with new crop data.

**Q: Is the application production-ready?**
A: Yes, includes comprehensive security, testing, monitoring, and deployment configurations.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **MongoDB Atlas** for database hosting
- **Mapbox** for mapping services  
- **scikit-learn** for ML capabilities
- **Node.js & Express** community
- **Open source contributors**

---

**Built with ❤️ by the CropConnect team**

*Connecting farmers and buyers through technology, powered by AI*