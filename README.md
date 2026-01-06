# 🌾 CropConnect - Intelligent Farmer-to-Buyer Trading Platform

**CropConnect** is a comprehensive full-stack web application that connects **farmers** with **buyers** to facilitate transparent, location-based crop trade. It features ML-powered price predictions, intelligent crop recommendations, multilingual chatbot support, and complete inventory management.

🔗 **Live Demo:** https://crop-connect-t0qz.onrender.com/

---

## ✨ Key Features

### 👥 User Management
- **Three User Roles**: Farmers, Buyers, and Admins
- **Secure Authentication**: Passport.js with bcrypt password hashing
- **Role-Based Access Control**: Middleware-protected routes
- **Session Management**: MongoDB-backed sessions

### 🌾 Crop Management
- **Intelligent Crop Recommendations**: Weighted scoring algorithm (35% soil, 35% climate, 15% season, 15% economics)
- **Crop Knowledge Base**: Comprehensive crop information with growing procedures
- **Price Prediction**: ML-powered price forecasting using Random Forest
- **Fertilizer Recommendations**: AI-based soil analysis and fertilizer suggestions

### 💬 Multilingual Chatbot
- **English & Telugu Support**: Natural language processing in both languages
- **Voice Input/Output**: Web Speech API for mic input and text-to-speech
- **Smart Queries**: Answers questions about prices, weather, growing processes, transactions, and sales

### 📊 Admin Dashboard
- **User Management**: View and manage farmers, buyers, and admins
- **Transaction Analytics**: Track all sales and transactions
- **Request Management**: Monitor and resolve buyer requests
- **Crop Database Management**: Add, edit, and manage crop information
- **Analytics & Reports**: Comprehensive platform statistics

### 🗺️ Location-Based Features
- **Interactive Maps**: Mapbox GL JS integration
- **Location-Based Matching**: Find nearby farmers/buyers
- **Climate Data Derivation**: Automatic climate data from location

### 📦 Inventory Management
- **Available Inventory**: Farmers can add and manage crop inventory
- **Sold Inventory Tracking**: Automatic tracking of completed sales
- **Request System**: Buyers can send purchase requests to farmers
- **Order Management**: Complete order lifecycle management

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20.12.2+
- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose
- **Authentication**: Passport.js with local strategy
- **Validation**: Joi schema validation
- **Security**: Helmet.js, express-rate-limit, bcrypt

### Frontend
- **Templating**: EJS with ejs-mate layouts
- **Styling**: Custom CSS with responsive design
- **JavaScript**: Vanilla JS with Web Speech API
- **Maps**: Mapbox GL JS

### Machine Learning
- **Language**: Python 3.9+
- **Libraries**: scikit-learn, pandas, numpy
- **Model**: Random Forest Regressor for price prediction
- **Training**: Time-series cross-validation

### DevOps
- **Containerization**: Docker & Docker Compose
- **Testing**: Jest with Supertest
- **CI/CD**: Ready for deployment on Render, Heroku, Vercel

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.12.2 or higher
- Python 3.9+ (for ML features)
- MongoDB Atlas account (free tier available)
- Mapbox account with API token

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/BaadeVamshi/Crop_Connect.git
cd Crop_Connect
```

2. **Install Node.js dependencies**
```bash
npm install
```

3. **Install Python ML dependencies**
```bash
pip install -r ml/requirements.txt
```

4. **Create `.env` file**
```env
# Database
ATLASDB_URL=mongodb+srv://username:password@cluster.mongodb.net/cropconnect
DB_NAME=cropconnect

# Security
SECRET=your-super-secret-session-key-minimum-32-characters
NODE_ENV=development

# External Services
MAP_TOKEN=your-mapbox-access-token
OPENWEATHER_API_KEY=your-openweather-api-key

# Server
PORT=8080
```

5. **Generate ML training data (optional)**
```bash
npm run generate-data
```

6. **Train ML model (optional)**
```bash
npm run train-ml
```

7. **Seed crop database**
```bash
node scripts/seedCrops.js
```

8. **Start the server**
```bash
# Development
npm run dev

# Production
npm start
```

9. **Visit the application**
```
http://localhost:8080
```

---

## 📚 Project Structure

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for detailed directory structure.

Key directories:
- `models/` - MongoDB schemas and business logic
- `routes/` - Express route handlers
- `views/` - EJS templates
- `ml/` - Machine learning pipeline
- `services/` - Business logic services
- `middleware/` - Authentication and security middleware

---

## 🎯 Usage Guide

### For Farmers

1. **Sign Up/Login**: Create a farmer account with location
2. **Add Inventory**: Add crops you have available for sale
3. **View Recommendations**: Get AI-powered crop recommendations based on your soil, climate, and preferences
4. **Manage Requests**: Accept or reject buyer purchase requests
5. **Track Sales**: View your sold inventory and transaction history
6. **Chatbot**: Ask questions about prices, weather, growing processes

### For Buyers

1. **Sign Up/Login**: Create a buyer account with location
2. **Browse Farmers**: View available farmers and their inventory on the map
3. **Send Requests**: Send purchase requests to farmers
4. **Track Orders**: Monitor your order status
5. **Chatbot**: Get information about crop prices and availability

### For Admins

1. **Sign Up/Login**: Create an admin account (or use dev endpoint)
2. **Dashboard**: View platform statistics and analytics
3. **User Management**: Manage farmers, buyers, and other admins
4. **Crop Management**: Add, edit, and manage crop database
5. **Request Management**: Monitor and resolve platform requests
6. **Analytics**: View detailed platform analytics

---

## 🤖 Machine Learning

### Price Prediction Model

The ML model uses Random Forest Regressor to predict crop prices based on:
- Weather factors (temperature, humidity, rainfall, wind, sunshine)
- Seasonal patterns
- Historical price trends
- Market demand factors
- Location-specific data

**Model Performance**:
- R² Score: ~0.95+
- MAE: ~3-4 ₹/kg
- RMSE: ~5-6 ₹/kg

### Training the Model

```bash
# Generate synthetic training data
npm run generate-data

# Train the model
npm run train-ml
```

The trained model is saved in `ml/models/` directory.

---

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **Session Security**: Secure, httpOnly cookies
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Joi schema validation
- **XSS Protection**: Helmet.js security headers
- **SQL Injection Prevention**: Mongoose parameterized queries
- **CSRF Protection**: Session-based CSRF tokens

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

Tests use MongoDB Memory Server for isolated testing.

---

## 🐳 Docker Deployment

```bash
# Build Docker image
docker build -t cropconnect .

# Run with Docker Compose
docker-compose up

# Or run standalone
docker run -p 8080:8080 --env-file .env cropconnect
```

---

## 📖 API Documentation

### Authentication Endpoints
- `POST /users/signupfarmer` - Farmer registration
- `POST /users/loginfarmer` - Farmer login
- `POST /users/signupbuyer` - Buyer registration
- `POST /users/loginbuyer` - Buyer login
- `POST /users/signupadmin` - Admin registration
- `POST /users/loginadmin` - Admin login

### Crop Recommendation API
- `POST /api/recommendations` - Get crop recommendations
  - Body: `{ soil_type, ph, rainfall, season, location, ... }`
  - Returns: Weighted scored recommendations with accuracy indicator

### Chatbot API
- `POST /api/chat` - Chatbot interaction
  - Body: `{ message, lang }`
  - Returns: AI-generated response

### Price Prediction API
- `POST /api/predict-price` - Predict crop prices
  - Body: `{ crop_name, location, date, weather_data }`
  - Returns: Predicted price with confidence

See [docs/api-documentation.md](./docs/api-documentation.md) for complete API reference.

---

## 🛣️ Roadmap

- [ ] Real-time notifications
- [ ] Payment gateway integration
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Weather API integration for real-time data
- [ ] Multi-language support expansion
- [ ] Blockchain-based transaction records

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the ISC License.

---

## 👥 Authors

- **Vamshi Baade** - Initial work

---

## 🙏 Acknowledgments

- Mapbox for mapping services
- MongoDB Atlas for database hosting
- scikit-learn community for ML tools
- All contributors and users

---

## 📞 Support

For support, email support@cropconnect.com or open an issue on GitHub.

---

**Made with ❤️ for farmers and buyers**
