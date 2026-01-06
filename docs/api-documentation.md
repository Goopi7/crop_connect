# CropConnect API Documentation

## Base URL
- Development: `http://localhost:8080`
- Production: `https://your-domain.com`

## Authentication
All API endpoints require authentication. Users must be logged in as either a Farmer or Buyer.

### Authentication Headers
```
Cookie: cropconnect.sid=<session-cookie>
```

## API Endpoints

### 1. Crop Price Prediction

**Endpoint:** `POST /api/predict-price`

**Description:** Predicts crop prices based on weather conditions, location, and market factors.

**Authentication:** Required (Farmer/Buyer)

**Request Body:**
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
  },
  "prediction_date": "2024-12-15T00:00:00.000Z"
}
```

**Required Fields:**
- `crop_name` (string): Must be one of: wheat, rice, corn, tomato, potato, onion, soybean, cotton

**Optional Fields:**
- `location_id` (string): Default "LOC001"
- `quantity` (number): Default 100
- `weather_forecast` (object): Weather parameters with defaults
- `prediction_date` (string): ISO date string, default current date

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "crop": "wheat",
    "location": "LOC001",
    "prediction_date": "2024-12-15T00:00:00.000Z",
    "predicted_price": 28.45,
    "confidence_interval": {
      "lower_bound": 24.18,
      "upper_bound": 32.72
    },
    "currency": "INR",
    "unit": "per kg",
    "historical_average": 26.30,
    "weather_factors": {
      "temperature": 25,
      "humidity": 60,
      "rainfall": 10,
      "wind_speed": 15,
      "sunshine_hours": 8
    },
    "model_info": {
      "version": "1.0",
      "prediction_id": "64f8a7b2c5d4e1a234567890"
    }
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "crop_name is required"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 2. Fertilizer Recommendation

**Endpoint:** `POST /api/recommend-fertilizer`

**Description:** Provides fertilizer recommendations based on soil analysis and crop requirements.

**Authentication:** Required (Farmer/Buyer)

**Request Body:**
```json
{
  "crop_name": "wheat",
  "soil_type": "loamy",
  "soil_ph": 7.0,
  "organic_matter": 2.5,
  "nitrogen": 50,
  "phosphorus": 30,
  "potassium": 40,
  "location_id": "LOC001",
  "growth_stage": "vegetative"
}
```

**Required Fields:**
- `crop_name` (string): Must be one of supported crops

**Optional Fields:**
- `soil_type` (string): sandy, loamy, clay, silt, peaty, chalky (default: "loamy")
- `soil_ph` (number): 3-11 range (default: 7.0)
- `organic_matter` (number): Percentage (default: 2.5)
- `nitrogen`, `phosphorus`, `potassium` (numbers): Current soil levels (defaults: 50, 30, 40)
- `location_id` (string): Location identifier (default: "LOC001")
- `growth_stage` (string): seedling, vegetative, flowering, fruiting, maturity (default: "vegetative")

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "crop": "wheat",
    "location": "LOC001",
    "soil_analysis": {
      "type": "loamy",
      "ph": 7.0,
      "organic_matter": 2.5,
      "nutrient_levels": {
        "nitrogen": 50,
        "phosphorus": 30,
        "potassium": 40
      }
    },
    "fertilizer_recommendations": [
      {
        "nutrient": "NITROGEN",
        "amount": 70,
        "unit": "kg/hectare",
        "timing": "before next growth stage",
        "fertilizer_type": "Urea"
      },
      {
        "nutrient": "PHOSPHORUS",
        "amount": 30,
        "unit": "kg/hectare",
        "timing": "before next growth stage",
        "fertilizer_type": "Diammonium Phosphate (DAP)"
      }
    ],
    "nutrient_status": {
      "nitrogen": {
        "current_level": 50,
        "optimal_level": 120,
        "status": "deficient",
        "recommendation_kg_per_hectare": 70,
        "action": "increase"
      },
      "phosphorus": {
        "current_level": 30,
        "optimal_level": 60,
        "status": "deficient",
        "recommendation_kg_per_hectare": 30,
        "action": "increase"
      },
      "potassium": {
        "current_level": 40,
        "optimal_level": 40,
        "status": "optimal",
        "recommendation_kg_per_hectare": 0,
        "action": "maintain"
      }
    },
    "ph_adjustment": {
      "issue": "Soil too acidic",
      "recommendation": "Apply lime (CaCO3)",
      "amount": "1000 kg/hectare",
      "reason": "Low pH reduces nutrient availability"
    },
    "organic_matter_advice": {
      "recommendation": "Increase organic matter content",
      "methods": ["Add compost", "Green manuring", "Crop residue incorporation"],
      "target": "3-5% organic matter",
      "benefits": ["Improved soil structure", "Better nutrient retention", "Enhanced microbial activity"]
    },
    "general_advice": [
      "Apply fertilizers in split doses for better efficiency",
      "Consider soil moisture before fertilizer application",
      "Monitor crop response and adjust in next season",
      "Best application time for wheat: Basal + 21 days after sowing + flowering"
    ],
    "recommendation_id": "64f8a7b2c5d4e1a234567891"
  }
}
```

### 3. Prediction History

**Endpoint:** `GET /api/predictions`

**Description:** Retrieves user's price prediction history.

**Authentication:** Required

**Query Parameters:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "crop": "wheat",
      "location": "LOC001",
      "prediction_date": "2024-12-15T00:00:00.000Z",
      "predicted_price": 28.45,
      "confidence": {
        "lower_bound": 24.18,
        "upper_bound": 32.72
      },
      "created": "2024-12-10T10:30:00.000Z"
    }
  ]
}
```

### 4. Fertilizer Recommendation History

**Endpoint:** `GET /api/fertilizer-history`

**Description:** Retrieves user's fertilizer recommendation history.

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f8a7b2c5d4e1a234567891",
      "crop_name": "wheat",
      "soil_profile": {
        "soil_type": "loamy",
        "ph": 7.0,
        "organic_matter": 2.5,
        "nutrients": {
          "nitrogen": 50,
          "phosphorus": 30,
          "potassium": 40
        }
      },
      "recommendations": {
        "fertilizers": [
          {
            "nutrient": "NITROGEN",
            "amount": 70,
            "unit": "kg/hectare",
            "timing": "before next growth stage",
            "fertilizer_type": "Urea"
          }
        ]
      },
      "created_at": "2024-12-10T10:30:00.000Z"
    }
  ]
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Rate Limits

- General API: 100 requests per 15 minutes per IP
- Authentication: 5 requests per 15 minutes per IP
- ML Predictions: 10 requests per minute per IP

## Data Models

### Crop Types
Supported crops: `wheat`, `rice`, `corn`, `tomato`, `potato`, `onion`, `soybean`, `cotton`

### Location IDs
Example location identifiers: `LOC001`, `LOC002`, `LOC003`, `LOC004`, `LOC005`

### Soil Types
Supported soil types: `sandy`, `loamy`, `clay`, `silt`, `peaty`, `chalky`

### Growth Stages
Supported stages: `seedling`, `vegetative`, `flowering`, `fruiting`, `maturity`

### Nutrient Status
Status values: `deficient`, `optimal`, `excess`

## Example Usage

### cURL Examples

**Price Prediction:**
```bash
curl -X POST http://localhost:8080/api/predict-price \
  -H "Content-Type: application/json" \
  -H "Cookie: cropconnect.sid=your-session-cookie" \
  -d '{
    "crop_name": "wheat",
    "location_id": "LOC001",
    "quantity": 100,
    "weather_forecast": {
      "temperature": 25,
      "humidity": 60,
      "rainfall": 10
    }
  }'
```

**Fertilizer Recommendation:**
```bash
curl -X POST http://localhost:8080/api/recommend-fertilizer \
  -H "Content-Type: application/json" \
  -H "Cookie: cropconnect.sid=your-session-cookie" \
  -d '{
    "crop_name": "wheat",
    "soil_ph": 6.5,
    "nitrogen": 45,
    "phosphorus": 25,
    "potassium": 35
  }'
```

### JavaScript Examples

**Using Fetch API:**
```javascript
// Price prediction
const predictPrice = async (cropData) => {
  try {
    const response = await fetch('/api/predict-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify(cropData)
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('Predicted price:', result.data.predicted_price);
    } else {
      console.error('Error:', result.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};

// Usage
predictPrice({
  crop_name: 'wheat',
  location_id: 'LOC001',
  quantity: 100
});
```

## Integration Notes

1. **Session Management:** Ensure proper session handling for authentication
2. **Error Handling:** Always check the `success` field in responses
3. **Rate Limiting:** Implement exponential backoff for rate limit errors
4. **Data Validation:** Validate input data on the client side before sending requests
5. **ML Service:** The system falls back to rule-based calculations if ML service is unavailable

## Support

For API support and questions, contact the development team or refer to the main README documentation.