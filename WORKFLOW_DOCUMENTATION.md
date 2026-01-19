# 🌾 CropConnect - Complete Workflow Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [User Roles & Authentication](#user-roles--authentication)
4. [Core Workflows](#core-workflows)
5. [Payment System](#payment-system)
6. [Inventory Management](#inventory-management)
7. [Order Processing](#order-processing)
8. [ML & AI Features](#ml--ai-features)
9. [Admin Dashboard](#admin-dashboard)
10. [Database Models](#database-models)

---

## 🎯 Project Overview

**CropConnect** is a full-stack agricultural trading platform that connects farmers directly with buyers. It facilitates transparent crop trading with intelligent recommendations, price predictions, and automated inventory management.

### Key Objectives
- **Direct Farmer-Buyer Connection**: Eliminate middlemen
- **Transparent Pricing**: Real-time price data and predictions
- **Intelligent Recommendations**: AI-powered crop and fertilizer suggestions
- **Secure Payments**: Multiple payment methods with direct farmer account transfers
- **Comprehensive Management**: Complete admin oversight and analytics

---

## 🏗️ Architecture & Technology Stack

### Backend
- **Framework**: Express.js (Node.js)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with Local Strategy
- **Session Management**: Express-session with MongoDB store
- **Validation**: Joi schema validation
- **Payment Gateway**: Razorpay integration
- **Geocoding**: Mapbox API

### Frontend
- **Template Engine**: EJS (Embedded JavaScript)
- **Styling**: Bootstrap 5
- **Maps**: Mapbox GL JS
- **Charts**: Chart.js (for analytics)

### ML/AI
- **Price Prediction**: Python (Random Forest model)
- **Crop Recommendations**: Weighted scoring algorithm
- **Chatbot**: Natural language processing

### Services
- **Payment Service**: Handles COD, UPI, and Razorpay payments
- **Receipt Service**: PDF generation for transactions
- **Chatbot Service**: Agricultural Q&A system
- **Scheduler Service**: Automated price updates

---

## 👥 User Roles & Authentication

### 1. **Farmer**
- **Purpose**: Sell crops to buyers
- **Capabilities**:
  - Manage inventory (add, update, delete crops)
  - Send crop requests to buyers
  - View orders and sales history
  - Get crop recommendations
  - Configure payment account (Razorpay.me)
  - View fertilizer advice

### 2. **Buyer**
- **Purpose**: Purchase crops from farmers
- **Capabilities**:
  - Browse available inventory
  - Accept/reject farmer requests
  - Create orders
  - Make payments (COD, UPI, Online)
  - View order history
  - Download receipts

### 3. **Admin**
- **Purpose**: Platform management and oversight
- **Capabilities**:
  - Manage users (farmers, buyers, admins)
  - View analytics and reports
  - Monitor transactions
  - Manage crop database
  - Handle requests and disputes
  - Generate receipts

### Authentication Flow

```
1. User Registration
   ├── Signup (Farmer/Buyer/Admin)
   ├── Joi Validation
   ├── Password Hashing (bcrypt via passport-local-mongoose)
   └── Auto-login after signup

2. User Login
   ├── Passport Local Strategy
   ├── Session Creation (7-day expiry)
   ├── Role-based Redirect
   └── Flash Messages

3. Session Management
   ├── MongoDB Session Store
   ├── Serialize/Deserialize by User Type
   └── Middleware Protection (isLoggedIn, isFarmer, isBuyer, isAdmin)
```

---

## 🔄 Core Workflows

### **Workflow 1: Farmer Registration & Setup**

```
1. Farmer Signs Up
   POST /users/signupfarmer
   ├── Input: name, username, email, password, location
   ├── Validation: Joi schema
   ├── Geocoding: Convert location to coordinates (Mapbox)
   ├── Password: Hashed with bcrypt
   └── Auto-login → Redirect to /listings/farmers

2. Farmer Dashboard
   GET /listings/farmers
   ├── Load Available Inventory
   ├── Load Sold Inventory
   ├── Check Pending Requests
   ├── Get Crop Recommendations (based on location/price)
   └── Display Fertilizer Tips

3. Add Inventory
   POST /listings/addInventory
   ├── Input: crop, price, quantity
   ├── Validation: Joi inventory schema
   ├── Check if crop exists in AvailableInventory
   ├── If exists: Update quantity
   └── If new: Add to inventory array
```

### **Workflow 2: Buyer Registration & Browsing**

```
1. Buyer Signs Up
   POST /users/signupbuyer
   ├── Input: name, username, email, password, location
   ├── Geocoding: Convert location to coordinates
   └── Auto-login → Redirect to /listings/buyer

2. Buyer Dashboard
   GET /listings/buyer
   ├── Load Pending Requests from Farmers
   ├── Display Request Details (crop, quantity, price)
   └── Show Action Buttons (View, Accept, Reject)

3. View Request
   GET /request/view/:id
   ├── Populate Farmer Details
   ├── Display Inventory Sent
   └── Show Accept/Reject Options
```

### **Workflow 3: Order Creation & Payment**

```
1. Buyer Accepts Request
   POST /accept-inventory/:id
   ├── Validate Quantities (at least one > 0)
   ├── Create Accepted Inventory Array
   ├── Update Request Status: "accepted"
   ├── Delete Other Pending Requests from Same Farmer
   ├── Update SoldInventory (add to farmer's sold items)
   ├── Update AvailableInventory (deduct quantities)
   └── Redirect to Payment Page: /buyer/payment/:orderId

2. Payment Page
   GET /buyer/payment/:id
   ├── Load Order Details
   ├── Display Order Summary
   ├── Show Payment Options:
   │   ├── UPI (with dummy QR code)
   │   └── COD (Cash on Delivery)
   └── Payment Method Selection

3. Process Payment
   POST /buyer/api/orders/:id/pay
   ├── Validate Payment Method
   ├── Process Payment:
   │   ├── UPI: Simulate payment (dummy)
   │   ├── COD: Mark as pending
   │   └── Online: Razorpay verification
   ├── Update Order Status: "paid"
   ├── Update Inventory (deduct from available)
   ├── Add to SoldInventory
   └── Redirect to Buyer Dashboard
```

### **Workflow 4: Farmer Sends Request to Buyer**

```
1. Farmer Views Buyers
   GET /listings/Orders
   ├── Get All Buyers
   ├── Get Farmer Location Coordinates
   └── Display Buyers on Map

2. Send Request
   POST /request/send
   ├── Input: buyerId
   ├── Check for Existing Pending Request
   ├── Get Farmer's Available Inventory
   ├── Create Request Document:
   │   ├── farmer: farmerId
   │   ├── buyer: buyerId
   │   ├── inventorySent: [crops from AvailableInventory]
   │   └── order: "pending"
   └── Flash Success Message
```

---

## 💳 Payment System

### Payment Methods

#### 1. **Cash on Delivery (COD)**
```
Flow:
1. Buyer selects COD
2. Order marked as "paid" (status: pending)
3. Payment collected on delivery
4. Order status updated to "completed" after delivery
```

#### 2. **UPI Payment**
```
Flow:
1. Buyer selects UPI
2. Display dummy UPI QR code
3. Buyer scans and pays (simulated)
4. Payment verified (mock)
5. Order status: "paid"
6. Inventory updated
```

#### 3. **Online Payment (Razorpay)**
```
Flow:
1. Buyer selects Online Payment
2. Check farmer's Razorpay.me username
3. Generate Payment Link:
   ├── Format: https://razorpay.me/@farmerUsername/amount
   ├── Payment goes DIRECTLY to farmer's account
   └── Store paymentLinkId in order
4. Buyer clicks link → Razorpay payment page
5. Payment Callback:
   ├── Verify payment status
   ├── Update order status
   └── Update inventory
```

### Payment Service Architecture

```javascript
PaymentService {
  - createPaymentLink(amount, currency, orderId, customerInfo, description, farmerRazorpayUsername)
  - processUPIPayment(orderId, amount, upiData)
  - processCODPayment(orderId, amount)
  - processOnlinePayment(orderId, amount, method, paymentData)
  - verifyRazorpayPayment(orderId, paymentId, signature)
  - getPaymentLinkStatus(paymentLinkId)
  - refundPayment(transactionId, amount, reason)
}
```

### Key Features
- **Direct Farmer Payment**: Payments go directly to farmer's Razorpay account
- **Multiple Methods**: COD, UPI, Online (Razorpay)
- **Payment Verification**: Signature verification for Razorpay
- **Receipt Generation**: PDF receipts for all transactions

---

## 📦 Inventory Management

### Inventory Types

#### 1. **AvailableInventory**
```javascript
Schema {
  farmer: ObjectId (ref: FarmerLogin)
  inventory: [{
    crop: String,
    price: Number,
    quantity: Number
  }]
}
```

**Operations:**
- **Add**: POST /listings/addInventory
- **Update**: PATCH /listings/update/:crop
- **Delete**: GET /listings/delete/:crop
- **View**: GET /listings/farmers

#### 2. **SoldInventory**
```javascript
Schema {
  farmer: ObjectId (ref: FarmerLogin)
  inventory: [{
    crop: String,
    price: Number,
    quantity: Number
  }]
}
```

**Operations:**
- **Auto-update**: When buyer accepts request
- **View**: GET /listings/farmers (sold section)

### Inventory Flow

```
1. Farmer Adds Inventory
   └── AvailableInventory.inventory.push({ crop, price, quantity })

2. Buyer Accepts Request
   ├── Create Order
   ├── Update SoldInventory (add items)
   └── Update AvailableInventory (deduct quantities)

3. Payment Completed
   ├── Finalize Order
   └── Inventory permanently moved to SoldInventory
```

---

## 📋 Order Processing

### Order Model
```javascript
Order {
  buyer: ObjectId (ref: BuyerLogin)
  farmer: ObjectId (ref: FarmerLogin)
  items: [{
    crop: String,
    quantity: Number,
    unitPrice: Number,
    total: Number
  }]
  subtotal: Number
  taxRate: Number (default: 0.05 = 5%)
  taxAmount: Number
  grandTotal: Number
  status: ['created', 'paid', 'shipped', 'completed', 'cancelled']
  payment: {
    method: ['COD', 'online', 'upi']
    txnId: String
    status: ['pending', 'success', 'failed']
    paymentLinkId: String
    paymentLink: String
  }
  shipping: {
    name: String
    phone: String
    address: String
    pincode: String
  }
}
```

### Order Lifecycle

```
1. Order Created
   Status: "created"
   Payment: { method: selected, status: "pending" }

2. Payment Processed
   Status: "paid"
   Payment: { status: "success", txnId: "..." }

3. Order Shipped
   Status: "shipped"
   (Manual update by farmer/admin)

4. Order Completed
   Status: "completed"
   (After delivery confirmation)

5. Order Cancelled
   Status: "cancelled"
   (If payment fails or buyer cancels)
```

### Order APIs

```
POST /buyer/api/orders/checkout
  - Create new order
  - Validate inventory
  - Calculate totals (with 5% tax)
  - Return orderId and redirectUrl

GET /buyer/payment/:id
  - Render payment page
  - Show order summary
  - Display payment options

POST /buyer/api/orders/:id/pay
  - Process payment
  - Update order status
  - Update inventory
  - Return payment result

GET /buyer/api/orders/:id/receipt
  - Generate PDF receipt
  - Download receipt

GET /buyer/api/orders/:id/payment-status
  - Check payment status
  - Return order and payment info
```

---

## 🤖 ML & AI Features

### 1. **Crop Recommendations**

**Algorithm**: Weighted Scoring System
```
Scoring Factors:
- Soil Type: 35%
- Climate/Water Availability: 35%
- Season: 15%
- Economics (Price/Market): 15%

Process:
1. User Input: soil_type, irrigation, soil_ph, NPK values, land_size, season, location
2. Query Crop Database
3. Calculate Match Score for Each Crop
4. Return Top 5 Recommendations with:
   - Score breakdown
   - Expected yield
   - Expected price
   - Growing process steps
   - Fertilizer plan
```

**Endpoint**: `POST /advisor/recommend`

### 2. **Price Prediction**

**Model**: Random Forest (Python)
```
Features:
- Historical price data
- Location
- Season
- Crop type
- Market trends

Process:
1. Load trained model (.pkl file)
2. Preprocess input data
3. Predict price for next 30 days
4. Return price forecast with confidence intervals
```

**Endpoint**: `POST /api/predict/price`

### 3. **Fertilizer Recommendations**

**Service**: `agronomyRecommendationService.js`
```
Input:
- Soil type
- NPK values (Nitrogen, Phosphorus, Potassium)
- Crop type
- Location

Output:
- Recommended fertilizers
- Application schedule
- Dosage per hectare
- Split application advice
```

**Endpoint**: `POST /api/fertilizer/recommend`

### 4. **Chatbot**

**Service**: `chatbotService.js`
```
Query Types:
- procedure: Growing process questions
- pest_disease: Pest and disease management
- fertilizer: Fertilizer queries
- market: Price and market questions
- prediction: Price prediction requests
- general: General agricultural questions

Features:
- Multilingual (English & Telugu)
- Voice input/output (Web Speech API)
- Context-aware responses
- Structured answers (steps, assumptions, risks, next actions)
```

**Endpoint**: `POST /api/chat`

---

## 🎛️ Admin Dashboard

### Admin Routes

```
GET /admin/dashboard
  - Main dashboard with statistics
  - Tables: Farmers, Buyers, Recent Transactions

GET /admin/analytics
  - Analytics dashboard
  - Charts: User activity, crop distribution, top crops
  - Real-time data from database

GET /admin/requests
  - View all requests
  - Filter by status (pending, accepted, rejected)

GET /admin/crops
  - Manage crop database
  - Add/edit/delete crops

GET /admin/users
  - User management interface
```

### Admin APIs

```
GET /admin/api/farmers
  - List all farmers

GET /admin/api/farmers/:id
  - Get single farmer details

PUT /admin/api/farmers/:id
  - Update farmer (name, username, email, location, payment details)

DELETE /admin/api/farmers/:id
  - Delete farmer

GET /admin/api/buyers
  - List all buyers

GET /admin/api/buyers/:id
  - Get single buyer details

PUT /admin/api/buyers/:id
  - Update buyer

DELETE /admin/api/buyers/:id
  - Delete buyer

GET /admin/api/transactions
  - List all transactions/orders

GET /admin/api/transactions/:id/receipt
  - Generate PDF receipt for transaction

GET /admin/api/analytics
  - Get analytics data (overview, user activity, top crops, etc.)
```

### Analytics Data

```javascript
Analytics {
  overview: {
    totalUsers: Number
    totalFarmers: Number
    totalBuyers: Number
    totalTransactions: Number
    totalRevenue: Number
    activeUsers: Number
  }
  userActivity: {
    registrations: [{ date, farmers, buyers }]
    logins: [{ date, count }]
  }
  userDistribution: {
    role: [{ role, count }]
    location: [{ location, count }]
  }
  topCrops: [{ crop, sales, revenue }]
  recommendationSuccess: {
    totalRecommendations: Number
    acceptedRecommendations: Number
    successRate: Number
  }
  chatbotPerformance: {
    totalQueries: Number
    responseTime: Number
    satisfactionRate: Number
  }
  topChatbotTopics: [{ topic, count }]
  regionalData: [{ region, farmers, buyers, transactions }]
}
```

---

## 🗄️ Database Models

### User Models

#### FarmerLogin
```javascript
{
  name: String (required)
  username: String (required, unique)
  email: String (required, unique)
  location: String (required)
  razorpayMeUsername: String (optional)
  phone: String (optional)
  bankAccount: String (optional)
  geometry: { type: Point, coordinates: [lng, lat] }
  password: String (hashed)
  createdAt: Date
}
```

#### BuyerLogin
```javascript
{
  name: String (required)
  username: String (required, unique)
  email: String (required, unique)
  location: String (required)
  geometry: { type: Point, coordinates: [lng, lat] }
  password: String (hashed)
  createdAt: Date
}
```

#### AdminLogin
```javascript
{
  name: String (required)
  username: String (required, unique)
  email: String (required, unique)
  role: String (enum: ['admin', 'superadmin'])
  password: String (hashed)
  createdAt: Date
}
```

### Inventory Models

#### AvailableInventory
```javascript
{
  farmer: ObjectId (ref: FarmerLogin)
  inventory: [{
    crop: String
    price: Number
    quantity: Number
  }]
}
```

#### SoldInventory
```javascript
{
  farmer: ObjectId (ref: FarmerLogin)
  inventory: [{
    crop: String
    price: Number
    quantity: Number
  }]
}
```

### Order Models

#### Request (Legacy Order System)
```javascript
{
  farmer: ObjectId (ref: FarmerLogin)
  buyer: ObjectId (ref: BuyerLogin)
  order: String (enum: ['pending', 'accepted', 'rejected'])
  inventorySent: [{
    crop: String
    quantity: Number
    price: Number
  }]
  inventoryaccepted: [{
    crop: String
    quantity: Number
    price: Number
  }]
  createdAt: Date
}
```

#### Order (New Order System)
```javascript
{
  buyer: ObjectId (ref: BuyerLogin)
  farmer: ObjectId (ref: FarmerLogin)
  items: [{
    crop: String
    quantity: Number
    unitPrice: Number
    total: Number
  }]
  subtotal: Number
  taxRate: Number (default: 0.05)
  taxAmount: Number
  grandTotal: Number
  currency: String (default: 'INR')
  status: String (enum: ['created', 'paid', 'shipped', 'completed', 'cancelled'])
  payment: {
    method: String (enum: ['COD', 'online', 'upi'])
    txnId: String
    status: String (enum: ['pending', 'success', 'failed'])
    paymentLinkId: String
    paymentLink: String
    meta: Mixed
  }
  shipping: {
    name: String
    phone: String
    address: String
    pincode: String
  }
  createdAt: Date
  updatedAt: Date
}
```

### Crop Models

#### Crop
```javascript
{
  name: String (required, unique)
  category: String
  description: String
  planting_details: {
    seed_rate: { value: Number, unit: String }
    spacing: { row: String, plant: String }
    depth: String
  }
  nutrient_management: {
    nitrogen: { requirement: { value: Number, unit: String } }
    phosphorus: { requirement: { value: Number, unit: String } }
    potassium: { requirement: { value: Number, unit: String } }
  }
  water_requirements: {
    irrigation_schedule: { frequency: String }
  }
  harvesting: {
    days_to_maturity: { min: Number, max: Number }
    expected_yield: { min: Number, max: Number, unit: String }
  }
  suitable_regions: [String]
  suitable_seasons: [String]
  suitable_soil_types: [String]
}
```

#### CropPriceData
```javascript
{
  crop: String
  location: String
  price: Number
  date: Date
  source: String
}
```

### Chatbot Model

#### Chatbot
```javascript
{
  patterns: [String]
  queryType: String (default: 'general')
  crops: [String]
  regions: [String]
  seasons: [String]
  answer: String (required)
  steps: [String]
  assumptions: [String]
  risks: [String]
  nextActions: [String]
  keywords: [String]
  source: String
  verified: Boolean (default: false)
  createdAt: Date
  updatedAt: Date
}
```

---

## 🔐 Security & Middleware

### Authentication Middleware

```javascript
isLoggedIn: Check if user is authenticated
isFarmer: Check if user is a farmer
isBuyer: Check if user is a buyer
isAdmin: Check if user is an admin
hasAdminPermission: Check admin permissions (manage_users, etc.)
```

### Validation

```javascript
validateUser: Joi schema validation for user signup
validateInventory: Joi schema validation for inventory
```

### Security Features

- **Password Hashing**: bcrypt via passport-local-mongoose
- **Session Security**: HttpOnly cookies, MongoDB session store
- **CSRF Protection**: Method override for PUT/DELETE
- **Input Validation**: Joi schemas
- **Role-Based Access**: Middleware protection on all routes

---

## 📊 Data Flow Diagrams

### Complete Order Flow

```
┌─────────┐
│ Farmer  │
│ Adds    │
│ Inventory│
└────┬────┘
     │
     ▼
┌─────────────────┐
│ AvailableInventory│
└────┬────────────┘
     │
     │ Farmer sends request
     ▼
┌──────────────┐
│ Request      │
│ (pending)    │
└────┬─────────┘
     │
     │ Buyer accepts
     ▼
┌──────────────┐
│ Order        │
│ (created)    │
└────┬─────────┘
     │
     │ Redirect to payment
     ▼
┌──────────────┐
│ Payment Page │
│ (UPI/COD/Online)│
└────┬─────────┘
     │
     │ Payment processed
     ▼
┌──────────────┐
│ Order        │
│ (paid)       │
└────┬─────────┘
     │
     │ Update inventory
     ▼
┌─────────────────┐     ┌─────────────────┐
│ AvailableInventory│───▶│ SoldInventory   │
│ (deduct)        │     │ (add)           │
└─────────────────┘     └─────────────────┘
```

### Payment Flow

```
┌──────────────┐
│ Buyer        │
│ Selects      │
│ Payment Method│
└────┬─────────┘
     │
     ├─── COD ──────────▶ Order Status: "paid" (pending delivery)
     │
     ├─── UPI ──────────▶ Display QR Code → Simulate Payment → Order Status: "paid"
     │
     └─── Online ────────▶ Check Farmer Razorpay Account
                          │
                          ├─ Not Configured → Error Message
                          │
                          └─ Configured → Generate Payment Link
                                           │
                                           ▼
                                    https://razorpay.me/@farmerUsername/amount
                                           │
                                           ▼
                                    Payment goes DIRECTLY to farmer
                                           │
                                           ▼
                                    Callback → Verify → Update Order
```

---

## 🚀 Deployment & Environment

### Environment Variables

```env
# Database
ATLASDB_URL=mongodb+srv://...
DB_NAME=cropconnect

# Session
SECRET=your-secret-key

# Mapbox
MAP_TOKEN=pk.your-mapbox-token

# Razorpay
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
RAZORPAY_ME_USERNAME=default-username

# Application
NODE_ENV=production
PORT=8080
BASE_URL=https://your-domain.com
```

### Scripts

```json
{
  "start": "node app.js",
  "dev": "nodemon app.js",
  "test": "jest",
  "train-ml": "cd ml && python training/train_price_model.py"
}
```

---

## 📝 Key Features Summary

### For Farmers
✅ Inventory management (add, update, delete crops)
✅ Send crop requests to buyers
✅ View sales history
✅ Get AI-powered crop recommendations
✅ Receive fertilizer advice
✅ Configure payment account (Razorpay.me)
✅ View order history

### For Buyers
✅ Browse available inventory
✅ Accept/reject farmer requests
✅ Create orders
✅ Multiple payment options (COD, UPI, Online)
✅ View order history
✅ Download receipts (PDF)
✅ View farmer locations on map

### For Admins
✅ User management (CRUD operations)
✅ Analytics dashboard (real-time data)
✅ Transaction monitoring
✅ Request management
✅ Crop database management
✅ Generate receipts
✅ System statistics

### Platform Features
✅ ML-powered price predictions
✅ Intelligent crop recommendations
✅ Multilingual chatbot (English & Telugu)
✅ Location-based matching
✅ Secure payment processing
✅ PDF receipt generation
✅ Real-time analytics
✅ Automated price updates (scheduler)

---

## 🔄 API Endpoints Summary

### Authentication
- `POST /users/signupfarmer` - Farmer signup
- `POST /users/loginfarmer` - Farmer login
- `POST /users/signupbuyer` - Buyer signup
- `POST /users/loginbuyer` - Buyer login
- `POST /users/signupadmin` - Admin signup
- `POST /users/loginadmin` - Admin login
- `GET /logoutfarmer` - Farmer logout
- `GET /logoutbuyer` - Buyer logout
- `GET /logoutadmin` - Admin logout

### Farmer Routes
- `GET /listings/farmers` - Farmer dashboard
- `GET /listings/addInventory` - Add inventory form
- `POST /listings/addInventory` - Add inventory
- `GET /listings/update` - Update inventory form
- `PATCH /listings/update/:crop` - Update inventory
- `GET /listings/delete/:crop` - Delete inventory
- `GET /listings/Orders` - View buyers
- `POST /request/send` - Send request to buyer
- `GET /dashboard/farmer` - View orders
- `PUT /farmer/api/payment-account` - Update payment account

### Buyer Routes
- `GET /listings/buyer` - Buyer dashboard
- `GET /request/view/:id` - View request details
- `POST /accept-inventory/:id` - Accept request
- `GET /dashboard/buyer` - View orders
- `GET /buyer/payment/:id` - Payment page
- `POST /buyer/api/orders/checkout` - Create order
- `POST /buyer/api/orders/:id/pay` - Process payment
- `GET /buyer/api/orders/:id/receipt` - Download receipt

### Admin Routes
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/analytics` - Analytics page
- `GET /admin/api/farmers` - List farmers
- `GET /admin/api/farmers/:id` - Get farmer
- `PUT /admin/api/farmers/:id` - Update farmer
- `DELETE /admin/api/farmers/:id` - Delete farmer
- `GET /admin/api/buyers` - List buyers
- `GET /admin/api/buyers/:id` - Get buyer
- `PUT /admin/api/buyers/:id` - Update buyer
- `DELETE /admin/api/buyers/:id` - Delete buyer
- `GET /admin/api/transactions` - List transactions
- `GET /admin/api/transactions/:id/receipt` - Generate receipt
- `GET /admin/api/analytics` - Get analytics data

### ML/AI Routes
- `POST /advisor/recommend` - Get crop recommendations
- `POST /api/predict/price` - Price prediction
- `POST /api/fertilizer/recommend` - Fertilizer recommendations
- `POST /api/chat` - Chatbot query

---

## 🎯 Conclusion

CropConnect is a comprehensive agricultural trading platform that seamlessly connects farmers and buyers with intelligent features, secure payments, and complete management capabilities. The system is designed for scalability, security, and user-friendliness, making it an ideal solution for modern agricultural commerce.

For questions or issues, refer to the codebase or contact the development team.
