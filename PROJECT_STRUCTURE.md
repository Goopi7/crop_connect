# 📁 CropConnect Project Structure

## Directory Organization

```
Crop_Connect/
├── app.js                      # Main application entry point
├── start.js                    # Alternative entry point (if exists)
├── package.json                # Node.js dependencies
├── .env                        # Environment variables (not in repo)
├── .gitignore                  # Git ignore rules
│
├── models/                     # MongoDB Mongoose Models
│   ├── loginFarmer.js         # Farmer authentication model
│   ├── loginbuyer.js          # Buyer authentication model
│   ├── loginAdmin.js          # Admin authentication model
│   ├── cropModel.js           # Crop data and recommendation logic
│   ├── cropPriceModel.js      # Crop price prediction model
│   ├── fertilizerModel.js     # Fertilizer recommendation model
│   ├── requestSchema.js       # Buyer request schema
│   ├── totalInventorySchema.js # Inventory management schemas
│   ├── order.js               # Order management model
│   └── chatbot.js             # Chatbot model (if exists)
│
├── routes/                     # Express Route Handlers
│   ├── api.js                 # Main API routes (chatbot, recommendations, etc.)
│   ├── api/
│   │   └── crops.js           # Crop-specific API routes
│   ├── admin.js               # Admin dashboard routes
│   ├── crops.js               # Crop knowledge base routes
│   ├── chatbot.js             # Chatbot routes
│   └── buyer/
│       └── orders.js          # Buyer order management routes
│
├── middleware/                 # Custom Middleware
│   ├── security.js            # Security middleware (helmet, rate limiting)
│   └── middleware.js          # Authentication & authorization middleware
│
├── views/                      # EJS Templates
│   ├── layout/
│   │   ├── boilerplate.ejs   # Main layout template
│   │   └── boilerplatebuyer.ejs # Buyer-specific layout
│   ├── includes/
│   │   ├── navbar.ejs        # Navigation bar
│   │   ├── buyernavbar.ejs   # Buyer navigation
│   │   ├── footer.ejs        # Footer
│   │   └── flash.ejs         # Flash messages
│   ├── users/                 # Authentication pages
│   │   ├── loginfarmer.ejs
│   │   ├── signupfarmer.ejs
│   │   ├── loginbuyer.ejs
│   │   ├── signupbuyer.ejs
│   │   ├── loginadmin.ejs
│   │   └── signupadmin.ejs
│   ├── listings/              # Main application pages
│   │   ├── farmers.ejs       # Farmer dashboard
│   │   ├── buyer.ejs         # Buyer dashboard
│   │   ├── addInventory.ejs  # Add inventory form
│   │   ├── update.ejs        # Update inventory
│   │   ├── order.ejs         # Order details
│   │   ├── buyerorder.ejs    # Buyer orders
│   │   ├── farmerorders.ejs  # Farmer orders
│   │   ├── requestview.ejs  # Request view
│   │   └── viewRequestmap.ejs # Map view for requests
│   ├── admin/                 # Admin pages
│   │   ├── dashboard.ejs     # Admin dashboard
│   │   ├── users.ejs         # User management
│   │   ├── crops.ejs         # Crop management
│   │   ├── requests.ejs      # Request management
│   │   ├── analytics.ejs     # Analytics page
│   │   └── settings.ejs      # Settings page
│   ├── crops/                 # Crop knowledge base
│   │   ├── index.ejs         # Crop listing
│   │   ├── show.ejs          # Crop details
│   │   └── recommend.ejs    # Crop recommendation form
│   ├── advice/
│   │   └── fertilizer.ejs    # Fertilizer advice page
│   ├── chatbot.ejs           # Chatbot interface
│   ├── farmer/
│   │   └── dashboard.ejs     # Alternative farmer dashboard
│   └── home.ejs              # Home page
│
├── public/                     # Static Assets
│   ├── css/
│   │   └── style.css         # Main stylesheet
│   ├── js/
│   │   └── script.js         # Frontend JavaScript (chatbot, etc.)
│   └── images/                # Image assets
│       ├── background-img.avif
│       ├── Chat.png
│       ├── farmer.jpeg
│       └── image.png
│
├── ml/                        # Machine Learning Pipeline
│   ├── data/
│   │   ├── crop_price_data.csv           # Training dataset
│   │   └── synthetic_data_generator.py  # Data generation script
│   ├── models/                # Trained ML Models
│   │   ├── crop_price_model.pkl         # Price prediction model
│   │   ├── encoders.pkl                 # Label encoders
│   │   ├── scalers.pkl                  # Feature scalers
│   │   └── model_info.json             # Model metadata
│   ├── training/
│   │   └── train_price_model.py         # Model training script
│   └── requirements.txt                 # Python dependencies
│
├── services/                   # Business Logic Services
│   ├── scheduler.js           # Scheduled tasks (price updates)
│   ├── chatbotService.js      # Chatbot business logic
│   ├── priceFetcher.js       # Price fetching service
│   └── receiptService.js      # Receipt generation service
│
├── scripts/                   # Utility Scripts
│   ├── seedCrops.js          # Seed crop database
│   └── setup-local.sh        # Local setup script
│
├── test/                      # Test Suite
│   ├── api.test.js           # API endpoint tests
│   └── setup.js              # Test setup (MongoDB memory server)
│
├── docs/                      # Documentation
│   ├── api-documentation.md  # API documentation
│   └── deployment-checklist.md # Deployment guide
│
├── schema.js                  # Joi validation schemas
├── middleware.js              # Main middleware exports
├── jest.config.js             # Jest test configuration
├── Dockerfile                 # Docker container definition
├── docker-compose.yml         # Docker Compose configuration
├── README.md                  # Main project README
└── README_UPDATED.md          # Updated README (consolidate)
```

## Key Files Description

### Core Application Files

- **app.js**: Main Express application setup, middleware configuration, route mounting, MongoDB connection, session management, Passport authentication
- **schema.js**: Joi validation schemas for user input validation
- **middleware.js**: Authentication and authorization middleware (isFarmer, isBuyer, isAdmin, isLoggedIn)

### Models

- **loginFarmer.js**: Farmer user model with Passport local authentication
- **loginbuyer.js**: Buyer user model with Passport local authentication
- **loginAdmin.js**: Admin user model with role-based permissions
- **cropModel.js**: Crop data model with recommendation algorithm (weighted scoring system)
- **cropPriceModel.js**: Crop price data storage and aggregation
- **requestSchema.js**: Buyer request/order schema
- **totalInventorySchema.js**: Available and sold inventory schemas

### Routes

- **routes/api.js**: Main API endpoints (chatbot, recommendations, price prediction, fertilizer)
- **routes/admin.js**: Admin dashboard and management APIs
- **routes/crops.js**: Crop knowledge base routes
- **routes/chatbot.js**: Chatbot interface routes

### ML Pipeline

- **ml/data/synthetic_data_generator.py**: Generates realistic crop price data with seasonal patterns
- **ml/training/train_price_model.py**: Trains Random Forest model for price prediction
- **ml/models/**: Contains trained models (pickle files) and metadata

## Data Flow

1. **User Registration/Login** → Models (loginFarmer/loginbuyer/loginAdmin) → MongoDB
2. **Crop Recommendations** → routes/api.js → models/cropModel.js → Weighted scoring algorithm → Response
3. **Price Prediction** → routes/api.js → ML service → ml/models/crop_price_model.pkl → Response
4. **Chatbot** → routes/api.js → routes/chatbot.js → services/chatbotService.js → Response
5. **Inventory Management** → app.js → models/totalInventorySchema.js → MongoDB

## Environment Variables

Required in `.env`:
- `ATLASDB_URL`: MongoDB Atlas connection string
- `DB_NAME`: Database name
- `SECRET`: Session secret key
- `MAP_TOKEN`: Mapbox access token
- `OPENWEATHER_API_KEY`: OpenWeather API key (optional)
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 8080)

## Scripts

- `npm start`: Start production server
- `npm run dev`: Start development server with nodemon
- `npm test`: Run test suite
- `npm run train-ml`: Train ML price prediction model
- `npm run generate-data`: Generate synthetic training data


