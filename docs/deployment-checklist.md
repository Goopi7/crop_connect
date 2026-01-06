# CropConnect Deployment Checklist

## Pre-Deployment Requirements

### 1. Environment Variables
Create the following environment variables in your deployment platform:

```bash
# Database
ATLASDB_URL=mongodb+srv://username:password@cluster.mongodb.net/cropconnect

# Security
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
NODE_ENV=production

# External Services
MAP_TOKEN=your-mapbox-access-token
ML_SERVICE_URL=http://your-ml-service-url:5001
ML_API_KEY=your-ml-api-key-for-security

# Optional
PORT=8080
```

### 2. Required Dependencies
Ensure the following are installed:
- Node.js 18+
- Python 3.9+
- MongoDB Atlas account (or local MongoDB)
- Mapbox account with API token

## Platform-Specific Deployment Guides

### Render Deployment

**Step 1: Repository Setup**
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

**Step 2: Render Service Creation**
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `npm install && pip3 install -r ml/requirements.txt`
4. Set start command: `node app.js`
5. Set environment to Node

**Step 3: Environment Variables in Render**
```
ATLASDB_URL = mongodb+srv://...
SESSION_SECRET = your-secret-key
NODE_ENV = production
MAP_TOKEN = your-mapbox-token
```

**Step 4: Build Settings**
```yaml
# render.yaml
services:
  - type: web
    name: cropconnect
    env: node
    buildCommand: npm install && pip3 install -r ml/requirements.txt
    startCommand: node app.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 8080
```

### Heroku Deployment

**Step 1: Heroku CLI Setup**
```bash
npm install -g heroku
heroku login
heroku create cropconnect-app
```

**Step 2: Buildpacks**
```bash
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add heroku/python
```

**Step 3: Environment Variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=your-secret-key
heroku config:set ATLASDB_URL=mongodb+srv://...
heroku config:set MAP_TOKEN=your-mapbox-token
```

**Step 4: Deploy**
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

**Step 5: Scale Services**
```bash
heroku ps:scale web=1
```

### Vercel Deployment

**Step 1: Vercel Configuration**
Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "app.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/app.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

**Step 2: Deploy**
```bash
npm install -g vercel
vercel --prod
```

**Step 3: Environment Variables**
Set in Vercel dashboard or via CLI:
```bash
vercel env add SESSION_SECRET
vercel env add ATLASDB_URL
vercel env add MAP_TOKEN
```

### Docker Deployment

**Step 1: Build Image**
```bash
docker build -t cropconnect:latest .
```

**Step 2: Run Container**
```bash
docker run -d \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e ATLASDB_URL=mongodb+srv://... \
  -e SESSION_SECRET=your-secret \
  -e MAP_TOKEN=your-token \
  --name cropconnect-app \
  cropconnect:latest
```

**Step 3: Docker Compose (Recommended)**
```bash
# Set environment variables in .env file
echo "MAP_TOKEN=your-token" >> .env
echo "SESSION_SECRET=your-secret" >> .env

# Start services
docker-compose up -d
```

## Database Setup (MongoDB Atlas)

### Step 1: Create Cluster
1. Sign up for MongoDB Atlas
2. Create a new cluster (free tier available)
3. Set up database user with read/write permissions
4. Configure network access (allow your deployment IP)

### Step 2: Connection String
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/cropconnect?retryWrites=true&w=majority
```

### Step 3: Database Initialization
The app will automatically create collections on first run.

## Machine Learning Service Setup

### Option 1: Separate ML Service
Deploy the ML service separately:

**Python ML Service (Flask)**
```python
# ml/service/app.py
from flask import Flask, request, jsonify
import joblib
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from training.train_price_model import CropPricePredictionModel

app = Flask(__name__)
model = CropPricePredictionModel()

# Load trained model
try:
    model.model = joblib.load('./models/crop_price_model.pkl')
    model.scalers = joblib.load('./models/scalers.pkl')
    model.encoders = joblib.load('./models/encoders.pkl')
    print("Model loaded successfully")
except Exception as e:
    print(f"Error loading model: {e}")

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        # Process prediction request
        # Return prediction result
        return jsonify({
            'predicted_price': 25.50,
            'confidence_interval': {
                'lower_bound': 22.0,
                'upper_bound': 29.0
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
```

### Option 2: Integrated Fallback
The main application includes fallback calculations if ML service is unavailable.

## Security Checklist

### Production Security Settings

**1. Environment Variables**
- [ ] Secure SESSION_SECRET (minimum 32 characters)
- [ ] Proper MongoDB connection with authentication
- [ ] API keys secured and not exposed
- [ ] NODE_ENV set to 'production'

**2. Security Headers**
```javascript
// Already implemented in middleware/security.js
- [ ] Helmet for security headers
- [ ] Rate limiting for API endpoints
- [ ] Input sanitization
- [ ] CORS configuration
```

**3. Database Security**
- [ ] MongoDB user with minimal required permissions
- [ ] Network access restrictions in MongoDB Atlas
- [ ] Connection string encryption

**4. SSL/HTTPS**
- [ ] SSL certificate configured (handled by deployment platform)
- [ ] Secure cookies in production
- [ ] HTTPS redirects

## Monitoring and Logging

### Health Check Endpoint
```javascript
// Add to app.js
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: '1.0.0'
    });
});
```

### Logging Setup
```javascript
// Already implemented in middleware/security.js
- Request/response logging
- Error logging
- Performance monitoring
```

## Performance Optimization

### 1. Database Optimization
- [ ] Database indexes created (automatic with models)
- [ ] Connection pooling configured
- [ ] Query optimization

### 2. Caching Strategy
```javascript
// Optional: Add Redis for caching
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Cache frequently requested predictions
```

### 3. Static Assets
- [ ] Compression enabled
- [ ] Static file serving optimized
- [ ] CDN setup for assets (optional)

## ML Model Deployment

### 1. Model Training Pipeline
```bash
# Generate synthetic data
npm run generate-data

# Train the model
npm run train-ml

# Verify model files created
ls ml/models/
```

### 2. Model Serving Options

**Option A: Embedded (Current)**
- Models served within Node.js app
- Fallback calculations if Python service unavailable

**Option B: Microservice**
- Separate Python Flask service
- Better resource isolation
- Requires separate deployment

### 3. Model Updates
```bash
# Update model with new data
cd ml
python training/train_price_model.py

# Deploy updated models
# (Implementation depends on deployment strategy)
```

## Testing Before Deployment

### 1. Local Testing
```bash
# Install dependencies
npm install
pip3 install -r ml/requirements.txt

# Set environment variables
export NODE_ENV=development
export ATLASDB_URL=your-test-db-url
export MAP_TOKEN=your-mapbox-token
export SESSION_SECRET=test-secret

# Run tests
npm test

# Start application
npm start
```

### 2. API Testing
```bash
# Test price prediction
curl -X POST http://localhost:8080/api/predict-price \
  -H "Content-Type: application/json" \
  -d '{"crop_name": "wheat"}'

# Test fertilizer recommendation  
curl -X POST http://localhost:8080/api/recommend-fertilizer \
  -H "Content-Type: application/json" \
  -d '{"crop_name": "wheat"}'
```

### 3. Load Testing (Optional)
```bash
# Using Apache Bench
ab -n 100 -c 10 http://localhost:8080/

# Using Artillery
npm install -g artillery
artillery quick --count 10 --num 100 http://localhost:8080/
```

## Post-Deployment Verification

### 1. Application Health
- [ ] Application starts successfully
- [ ] Database connection established
- [ ] All routes responding correctly
- [ ] ML endpoints working

### 2. Security Verification
- [ ] HTTPS enabled
- [ ] Security headers present
- [ ] Rate limiting functional
- [ ] Authentication working

### 3. Performance Metrics
- [ ] Response times acceptable (<500ms for API)
- [ ] Memory usage within limits
- [ ] No memory leaks detected

## Rollback Plan

### 1. Quick Rollback
```bash
# Heroku
heroku releases:rollback v[previous-version]

# Render
# Use Render dashboard to redeploy previous commit

# Docker
docker stop cropconnect-app
docker run [previous-image-tag]
```

### 2. Database Rollback
- Backup database before major deployments
- Keep schema migration scripts
- Document breaking changes

## Support and Maintenance

### 1. Monitoring
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure error reporting (Sentry, Bugsnag)
- Monitor resource usage

### 2. Updates
- Regular security updates
- Dependency updates
- Model retraining schedule

### 3. Backup Strategy
- Database backups (MongoDB Atlas automatic backups)
- Application code versioning
- ML model versioning

## Troubleshooting Common Issues

### 1. Database Connection Issues
```javascript
// Check connection string format
// Verify network access in MongoDB Atlas
// Ensure user permissions are correct
```

### 2. ML Service Issues
```javascript
// Check Python dependencies installed
// Verify model files exist
// Check ML service URL configuration
// Review fallback calculations working
```

### 3. Authentication Issues
```javascript
// Verify SESSION_SECRET is set
// Check cookie settings
// Ensure database user collection exists
```

### 4. Performance Issues
```javascript
// Check database query performance
// Monitor memory usage
// Review rate limiting settings
// Optimize ML prediction caching
```

This deployment checklist ensures a successful production deployment of the CropConnect application with proper security, monitoring, and maintenance procedures in place.