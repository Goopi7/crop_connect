# 🚀 CropConnect Setup Guide

## Complete Setup Instructions

### Step 1: Prerequisites Installation

#### Install Node.js
- Download from [nodejs.org](https://nodejs.org/)
- Version required: 20.12.2 or higher
- Verify installation: `node --version`

#### Install Python
- Download from [python.org](https://www.python.org/)
- Version required: 3.9 or higher
- Verify installation: `python --version`
- Ensure pip is installed: `pip --version`

#### Install MongoDB Atlas Account
- Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas)
- Create a free cluster
- Create a database user
- Get your connection string

#### Get Mapbox Token
- Sign up at [mapbox.com](https://www.mapbox.com/)
- Get your access token from dashboard

### Step 2: Project Setup

```bash
# 1. Clone repository
git clone https://github.com/BaadeVamshi/Crop_Connect.git
cd Crop_Connect

# 2. Install Node.js dependencies
npm install

# 3. Install Python ML dependencies
pip install -r ml/requirements.txt
```

### Step 3: Environment Configuration

Create `.env` file in root directory:

```env
# Database Configuration
ATLASDB_URL=mongodb+srv://username:password@cluster.mongodb.net/cropconnect
DB_NAME=cropconnect

# Security
SECRET=your-super-secret-key-minimum-32-characters-long
NODE_ENV=development

# External Services
MAP_TOKEN=pk.your_mapbox_token_here
OPENWEATHER_API_KEY=your_openweather_api_key_here

# Server Configuration
PORT=8080
USE_INMEM_MONGO=0
NO_LISTEN=0
```

### Step 4: Database Setup

#### Option A: MongoDB Atlas (Recommended for Production)
1. Use the connection string from Step 1
2. Add it to `.env` as `ATLASDB_URL`
3. The app will automatically connect

#### Option B: Local MongoDB (Development)
1. Install MongoDB locally
2. Update `ATLASDB_URL` to: `mongodb://localhost:27017/cropconnect`

### Step 5: Seed Initial Data

```bash
# Seed crop database with initial crop data
node scripts/seedCrops.js
```

### Step 6: ML Model Setup (Optional but Recommended)

```bash
# Generate training data (5000 records with realistic patterns)
cd ml
python data/synthetic_data_generator.py

# Train the price prediction model
python training/train_price_model.py
cd ..
```

**Note**: The ML models are already included in `ml/models/`, but you can retrain with updated data.

### Step 7: Start the Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### Step 8: Access the Application

- **Home**: http://localhost:8080
- **Farmer Signup**: http://localhost:8080/users/signupfarmer
- **Buyer Signup**: http://localhost:8080/users/signupbuyer
- **Admin Signup**: http://localhost:8080/users/signupadmin

---

## Creating Admin Account

### Method 1: Via Signup Page
1. Navigate to `/users/signupadmin`
2. Fill in the form:
   - Full Name: Your name
   - Username: Unique username
   - Email: Your Gmail address
   - Password: Strong password
3. Submit the form

### Method 2: Via Dev Endpoint (Development Only)
```bash
# Make a POST request to create admin
curl -X POST http://localhost:8080/dev/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Name",
    "username": "admin",
    "email": "admin@gmail.com",
    "password": "admin123",
    "role": "superadmin"
  }'
```

---

## Testing the Application

### Run Test Suite
```bash
npm test
```

### Manual Testing Checklist

#### Farmer Flow
- [ ] Sign up as farmer
- [ ] Login
- [ ] Add inventory
- [ ] View crop recommendations
- [ ] Use chatbot
- [ ] View requests
- [ ] Accept/reject requests

#### Buyer Flow
- [ ] Sign up as buyer
- [ ] Login
- [ ] Browse farmers on map
- [ ] Send purchase request
- [ ] View order status
- [ ] Use chatbot

#### Admin Flow
- [ ] Sign up as admin
- [ ] Login
- [ ] View dashboard
- [ ] Manage users
- [ ] Manage crops
- [ ] View analytics
- [ ] Manage requests

---

## Troubleshooting

### Issue: MongoDB Connection Failed
**Solution**: 
- Check your `ATLASDB_URL` in `.env`
- Ensure MongoDB Atlas IP whitelist includes your IP (0.0.0.0/0 for testing)
- Verify database user credentials

### Issue: ML Model Not Found
**Solution**:
- Run `python ml/training/train_price_model.py` to generate models
- Or ensure `ml/models/` directory contains `.pkl` files

### Issue: Map Not Loading
**Solution**:
- Verify `MAP_TOKEN` in `.env` is correct
- Check Mapbox token has proper permissions

### Issue: Session Errors
**Solution**:
- Ensure `SECRET` in `.env` is at least 32 characters
- Clear browser cookies and restart server

### Issue: Port Already in Use
**Solution**:
- Change `PORT` in `.env` to another port (e.g., 3000, 5000)
- Or kill the process using the port

---

## Production Deployment

### Environment Variables for Production

```env
NODE_ENV=production
SECRET=very-long-random-secret-key-for-production
ATLASDB_URL=your-production-mongodb-url
MAP_TOKEN=your-mapbox-token
```

### Security Checklist
- [ ] Use strong `SECRET` key (32+ characters, random)
- [ ] Enable HTTPS
- [ ] Set secure session cookies
- [ ] Enable rate limiting
- [ ] Use environment variables (never commit `.env`)
- [ ] Regular security updates

### Deployment Platforms

#### Render
1. Connect GitHub repository
2. Set build command: `npm install && pip install -r ml/requirements.txt`
3. Set start command: `node app.js`
4. Add environment variables

#### Heroku
```bash
heroku create cropconnect
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add heroku/python
heroku config:set NODE_ENV=production
# Add other env vars
git push heroku main
```

#### Docker
```bash
docker build -t cropconnect .
docker run -p 8080:8080 --env-file .env cropconnect
```

---

## Next Steps

1. **Customize**: Update branding, colors, and content
2. **Add Features**: Implement payment gateway, notifications
3. **Scale**: Set up load balancing, caching (Redis)
4. **Monitor**: Add logging (Winston), monitoring (PM2)
5. **Optimize**: Database indexing, query optimization

---

## Support

For issues or questions:
- Open an issue on GitHub
- Check documentation in `docs/` folder
- Review `PROJECT_STRUCTURE.md` for code organization

---

**Happy Farming! 🌾**


