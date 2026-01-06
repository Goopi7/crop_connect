#!/usr/bin/env python3
"""
Synthetic Crop Price Data Generator
Generates realistic crop price data for training ML models
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import json

# Crop types and their base prices (per kg)
CROP_BASE_PRICES = {
    'wheat': 25,
    'rice': 35,
    'corn': 20,
    'tomato': 45,
    'potato': 15,
    'onion': 30,
    'soybean': 55,
    'cotton': 80
}

# Location IDs for different regions
LOCATION_IDS = ['LOC001', 'LOC002', 'LOC003', 'LOC004', 'LOC005']

def generate_weather_features(date):
    """Generate realistic weather features based on date (seasonal patterns)"""
    month = date.month
    
    # Seasonal temperature patterns (India)
    if month in [12, 1, 2]:  # Winter
        base_temp = random.uniform(10, 25)
    elif month in [3, 4, 5]:  # Summer
        base_temp = random.uniform(25, 42)
    elif month in [6, 7, 8, 9]:  # Monsoon
        base_temp = random.uniform(22, 32)
    else:  # Post-monsoon
        base_temp = random.uniform(20, 30)
    
    # Seasonal rainfall patterns
    if month in [6, 7, 8, 9]:  # Monsoon
        rainfall = random.uniform(10, 100)
    elif month in [10, 11]:  # Post-monsoon
        rainfall = random.uniform(5, 30)
    else:  # Dry season
        rainfall = random.uniform(0, 15)
    
    # Humidity correlates with rainfall
    if rainfall > 20:
        humidity = random.uniform(60, 95)
    else:
        humidity = random.uniform(30, 70)
    
    # Sunshine hours (inverse of rainfall)
    if rainfall > 30:
        sunshine = random.uniform(3, 7)
    else:
        sunshine = random.uniform(7, 12)
    
    return {
        'temperature': round(base_temp, 2),
        'humidity': round(humidity, 2),
        'rainfall': round(rainfall, 2),
        'wind_speed': round(random.uniform(5, 25), 2),
        'sunshine_hours': round(sunshine, 2)
    }

def calculate_price_with_factors(base_price, weather, season, demand_factor):
    """Calculate crop price based on various factors"""
    
    # Weather impact
    weather_multiplier = 1.0
    if weather['rainfall'] < 5:  # Drought
        weather_multiplier *= 1.2
    elif weather['rainfall'] > 30:  # Flood
        weather_multiplier *= 1.15
    
    if weather['temperature'] > 35:  # Heat stress
        weather_multiplier *= 1.1
    
    # Seasonal variation
    seasonal_multiplier = 1.0 + (season * 0.1)
    
    # Demand factor (market fluctuation)
    demand_multiplier = demand_factor
    
    # Random noise
    noise = random.uniform(0.9, 1.1)
    
    final_price = base_price * weather_multiplier * seasonal_multiplier * demand_multiplier * noise
    return round(final_price, 2)

def generate_synthetic_data(num_records=1000, start_date='2020-01-01', end_date='2024-12-31'):
    """Generate synthetic crop price dataset"""
    
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')
    
    data = []
    
    for _ in range(num_records):
        # Random date
        random_date = start + timedelta(
            days=random.randint(0, (end - start).days)
        )
        
        # Random crop and location
        crop_name = random.choice(list(CROP_BASE_PRICES.keys()))
        location_id = random.choice(LOCATION_IDS)
        
        # Generate realistic weather features based on date
        weather = generate_weather_features(random_date)
        
        # Season factor (0-1 based on month)
        season = (random_date.month % 12) / 12
        
        # Demand factor
        demand_factor = random.uniform(0.8, 1.3)
        
        # Calculate quantity (seasonal and random variation)
        base_quantity = random.randint(100, 1000)
        quantity = base_quantity * (1 + season * 0.2)
        
        # Calculate price
        base_price = CROP_BASE_PRICES[crop_name]
        price = calculate_price_with_factors(base_price, weather, season, demand_factor)
        
        data.append({
            'date': random_date.strftime('%Y-%m-%d'),
            'location_id': location_id,
            'crop_name': crop_name,
            'price': price,
            'quantity': round(quantity),
            'temperature': weather['temperature'],
            'humidity': weather['humidity'],
            'rainfall': weather['rainfall'],
            'wind_speed': weather['wind_speed'],
            'sunshine_hours': weather['sunshine_hours'],
            'season': season,
            'demand_factor': demand_factor
        })
    
    return pd.DataFrame(data)

def save_data(df, filename='crop_price_data.csv'):
    """Save dataset to CSV file"""
    df.to_csv(filename, index=False)
    print(f"Dataset saved to {filename}")
    print(f"Dataset shape: {df.shape}")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
    print(f"Crops included: {df['crop_name'].unique()}")
    print(f"Locations included: {df['location_id'].unique()}")

if __name__ == "__main__":
    # Generate synthetic data with more records for better training
    print("Generating realistic synthetic crop price data...")
    print("This may take a moment...")
    df = generate_synthetic_data(num_records=5000, start_date='2020-01-01', end_date='2024-12-31')
    
    # Ensure data is sorted by date
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').reset_index(drop=True)
    
    # Save to CSV
    save_data(df, './ml/data/crop_price_data.csv')
    
    # Display sample data
    print("\nSample data:")
    print(df.head(10))
    
    # Basic statistics
    print("\nPrice statistics by crop:")
    print(df.groupby('crop_name')['price'].agg(['mean', 'min', 'max', 'std']).round(2))
    
    # Seasonal patterns
    print("\nAverage price by month (all crops):")
    df['month'] = pd.to_datetime(df['date']).dt.month
    monthly_avg = df.groupby('month')['price'].mean()
    print(monthly_avg.round(2))
    
    print("\n✅ Data generation complete!")
    print(f"Total records: {len(df)}")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")