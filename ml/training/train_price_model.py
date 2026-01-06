#!/usr/bin/env python3
"""
Crop Price Prediction Model Training Script
Uses Random Forest to predict crop prices based on weather and market factors
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, TimeSeriesSplit
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import json
import os

class CropPricePredictionModel:
    def __init__(self):
        self.model = None
        self.scalers = {}
        self.encoders = {}
        self.feature_columns = []
        self.model_info = {}
        
    def load_data(self, data_path):
        """Load and prepare the dataset"""
        print(f"Loading data from {data_path}")
        
        if not os.path.exists(data_path):
            print(f"Data file not found. Please run the synthetic data generator first.")
            return None
            
        df = pd.read_csv(data_path)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date').reset_index(drop=True)
        
        print(f"Loaded {len(df)} records")
        print(f"Date range: {df['date'].min()} to {df['date'].max()}")
        
        return df
    
    def feature_engineering(self, df):
        """Create additional features from the raw data"""
        df = df.copy()
        
        # Date-based features
        df['year'] = df['date'].dt.year
        df['month'] = df['date'].dt.month
        df['day_of_year'] = df['date'].dt.dayofyear
        df['quarter'] = df['date'].dt.quarter
        
        # Price lag features (for time series prediction)
        for crop in df['crop_name'].unique():
            crop_mask = df['crop_name'] == crop
            crop_data = df[crop_mask].copy()
            crop_data = crop_data.sort_values('date')
            
            # 30-day and 90-day moving averages
            crop_data['price_ma_30'] = crop_data['price'].rolling(window=30, min_periods=1).mean()
            crop_data['price_ma_90'] = crop_data['price'].rolling(window=90, min_periods=1).mean()
            
            # Price volatility (30-day rolling std)
            crop_data['price_volatility'] = crop_data['price'].rolling(window=30, min_periods=1).std()
            
            df.loc[crop_mask, 'price_ma_30'] = crop_data['price_ma_30'].values
            df.loc[crop_mask, 'price_ma_90'] = crop_data['price_ma_90'].values
            df.loc[crop_mask, 'price_volatility'] = crop_data['price_volatility'].values
        
        # Fill NaN values for newly created features
        df['price_ma_30'].fillna(df['price'], inplace=True)
        df['price_ma_90'].fillna(df['price'], inplace=True)
        df['price_volatility'].fillna(0, inplace=True)
        
        # Weather composite features
        df['temp_humidity_index'] = df['temperature'] * (df['humidity'] / 100)
        df['drought_indicator'] = (df['rainfall'] < 5).astype(int)
        df['flood_indicator'] = (df['rainfall'] > 30).astype(int)
        df['heat_stress_indicator'] = (df['temperature'] > 35).astype(int)
        
        return df
    
    def prepare_features(self, df, fit_encoders=True):
        """Prepare features for training"""
        df_processed = df.copy()
        
        # Encode categorical variables
        categorical_cols = ['crop_name', 'location_id']
        
        for col in categorical_cols:
            if fit_encoders:
                encoder = LabelEncoder()
                df_processed[f'{col}_encoded'] = encoder.fit_transform(df_processed[col])
                self.encoders[col] = encoder
            else:
                if col in self.encoders:
                    df_processed[f'{col}_encoded'] = self.encoders[col].transform(df_processed[col])
                else:
                    # Handle unseen categories
                    df_processed[f'{col}_encoded'] = 0
        
        # Select features for training
        feature_columns = [
            'crop_name_encoded', 'location_id_encoded',
            'temperature', 'humidity', 'rainfall', 'wind_speed', 'sunshine_hours',
            'year', 'month', 'day_of_year', 'quarter',
            'season', 'demand_factor', 'quantity',
            'price_ma_30', 'price_ma_90', 'price_volatility',
            'temp_humidity_index', 'drought_indicator', 'flood_indicator', 'heat_stress_indicator'
        ]
        
        # Store feature columns for later use
        if fit_encoders:
            self.feature_columns = feature_columns
        
        X = df_processed[feature_columns]
        
        # Scale numerical features
        if fit_encoders:
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            self.scalers['features'] = scaler
        else:
            if 'features' in self.scalers:
                X_scaled = self.scalers['features'].transform(X)
            else:
                X_scaled = X.values
        
        return X_scaled, df_processed['price'].values
    
    def train_model(self, X_train, y_train):
        """Train the Random Forest model with optimized hyperparameters"""
        print("Training Random Forest model with optimized parameters...")
        
        # Random Forest with improved hyperparameters for better accuracy
        self.model = RandomForestRegressor(
            n_estimators=200,  # Increased for better performance
            max_depth=20,  # Deeper trees for complex patterns
            min_samples_split=4,  # More splits
            min_samples_leaf=2,
            max_features='sqrt',  # Feature sampling
            bootstrap=True,
            oob_score=True,  # Out-of-bag scoring
            random_state=42,
            n_jobs=-1,
            verbose=1
        )
        
        self.model.fit(X_train, y_train)
        
        if hasattr(self.model, 'oob_score_'):
            print(f"Out-of-bag score: {self.model.oob_score_:.4f}")
        
        print("Model training completed")
        
    def evaluate_model(self, X_test, y_test):
        """Evaluate model performance"""
        y_pred = self.model.predict(X_test)
        
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        
        print(f"\nModel Performance:")
        print(f"MAE: {mae:.2f}")
        print(f"RMSE: {rmse:.2f}")
        print(f"R²: {r2:.4f}")
        
        # Store model performance
        self.model_info = {
            'mae': mae,
            'rmse': rmse,
            'r2': r2,
            'training_date': datetime.now().isoformat(),
            'feature_columns': self.feature_columns
        }
        
        return {'mae': mae, 'rmse': rmse, 'r2': r2}
    
    def cross_validate(self, X, y, cv=5):
        """Perform cross-validation"""
        print(f"\nPerforming {cv}-fold cross-validation...")
        
        # Use TimeSeriesSplit for time series data
        tscv = TimeSeriesSplit(n_splits=cv)
        cv_scores = cross_val_score(self.model, X, y, cv=tscv, scoring='neg_mean_absolute_error')
        
        print(f"CV MAE: {-cv_scores.mean():.2f} (+/- {cv_scores.std() * 2:.2f})")
        
    def feature_importance(self):
        """Get feature importance from the trained model"""
        if self.model is None:
            print("Model not trained yet")
            return None
        
        feature_names = self.feature_columns
        importance = self.model.feature_importances_
        
        feature_importance_df = pd.DataFrame({
            'feature': feature_names,
            'importance': importance
        }).sort_values('importance', ascending=False)
        
        print("\nTop 10 Feature Importances:")
        print(feature_importance_df.head(10))
        
        return feature_importance_df
    
    def save_model(self, model_path='./ml/models/'):
        """Save the trained model and preprocessing objects"""
        os.makedirs(model_path, exist_ok=True)
        
        # Save model
        joblib.dump(self.model, os.path.join(model_path, 'crop_price_model.pkl'))
        
        # Save scalers and encoders
        joblib.dump(self.scalers, os.path.join(model_path, 'scalers.pkl'))
        joblib.dump(self.encoders, os.path.join(model_path, 'encoders.pkl'))
        
        # Save model info
        with open(os.path.join(model_path, 'model_info.json'), 'w') as f:
            json.dump(self.model_info, f, indent=2)
        
        print(f"Model saved to {model_path}")
    
    def predict(self, input_data):
        """Make predictions on new data"""
        if self.model is None:
            print("Model not loaded")
            return None
        
        # Prepare features
        X, _ = self.prepare_features(input_data, fit_encoders=False)
        
        # Make prediction
        prediction = self.model.predict(X)
        
        return prediction

def main():
    """Main training pipeline"""
    # Initialize model
    model = CropPricePredictionModel()
    
    # Load data
    data_path = './ml/data/crop_price_data.csv'
    df = model.load_data(data_path)
    
    if df is None:
        print("Please run the synthetic data generator first:")
        print("python ml/data/synthetic_data_generator.py")
        return
    
    # Feature engineering
    print("\nPerforming feature engineering...")
    df_processed = model.feature_engineering(df)
    
    # Prepare features
    print("Preparing features...")
    X, y = model.prepare_features(df_processed, fit_encoders=True)
    
    # Split data (use time-based split for time series - 80/20 split)
    split_date = df_processed['date'].quantile(0.8)
    train_mask = df_processed['date'] < split_date
    
    X_train, y_train = X[train_mask], y[train_mask]
    X_test, y_test = X[~train_mask], y[~train_mask]
    
    print(f"\nData Split:")
    print(f"Training set size: {len(X_train)} ({len(X_train)/len(X)*100:.1f}%)")
    print(f"Test set size: {len(X_test)} ({len(X_test)/len(X)*100:.1f}%)")
    print(f"Split date: {split_date.strftime('%Y-%m-%d')}")
    
    # Train model
    model.train_model(X_train, y_train)
    
    # Evaluate model
    metrics = model.evaluate_model(X_test, y_test)
    
    # Cross validation
    model.cross_validate(X, y, cv=5)
    
    # Feature importance
    importance_df = model.feature_importance()
    
    # Save model
    model.save_model()
    
    print("\n" + "="*60)
    print("Model training completed successfully!")
    print("="*60)
    print(f"Final Model Performance:")
    print(f"  MAE:  {metrics['mae']:.2f} INR/kg")
    print(f"  RMSE: {metrics['rmse']:.2f} INR/kg")
    print(f"  R²:   {metrics['r2']:.4f}")
    print(f"\nModel saved to: ./ml/models/")
    print("You can now use the model for predictions via the API endpoint.")
    print("="*60)

if __name__ == "__main__":
    main()