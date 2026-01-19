# Google Price API Setup Guide

This guide explains how to set up Google Custom Search API to fetch real-time crop prices from Google.

## Overview

The CropConnect platform uses Google Search to fetch real-time market prices for crops. There are two methods available:

1. **Google Custom Search API** (Recommended) - Official API, more reliable
2. **Web Scraping** (Fallback) - Scrapes Google search results (may be blocked)

## Method 1: Google Custom Search API (Recommended)

### Step 1: Get Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Custom Search API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Custom Search API"
   - Click "Enable"

### Step 2: Create API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy your API key
4. (Optional) Restrict the API key to Custom Search API only for security

### Step 3: Create Custom Search Engine

1. Go to [Google Custom Search](https://programmablesearchengine.google.com/)
2. Click "Add" to create a new search engine
3. In "Sites to search", enter: `*` (to search the entire web)
4. Click "Create"
5. Go to "Setup" > "Basics"
6. Copy your **Search Engine ID** (CX)

### Step 4: Add to Environment Variables

Add these to your `.env` file:

```env
GOOGLE_API_KEY=your_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

### Step 5: Test

The API will automatically use these credentials when available. Test by adding inventory and checking if market prices are fetched.

## Method 2: Web Scraping (Fallback)

If you don't set up the Google API, the system will attempt to scrape Google search results. However, this method:

- May be blocked by Google's anti-bot measures
- Less reliable than the API
- May violate Google's Terms of Service
- Should only be used for development/testing

## How It Works

1. **Price Fetching Flow**:
   ```
   User enters crop name
   ↓
   Check cache (1 hour)
   ↓
   Check database (last 7 days)
   ↓
   Try Google Custom Search API (if configured)
   ↓
   Try web scraping (if API not available)
   ↓
   Fallback to base prices
   ```

2. **Caching**: Prices are cached for 1 hour to reduce API calls

3. **Database Storage**: Fetched prices are saved to database for future reference

## Rate Limits

- **Google Custom Search API**: 100 free queries per day
- **Web Scraping**: No official limit, but may be blocked if too frequent

## Troubleshooting

### Prices not updating?

1. Check if API keys are set correctly in `.env`
2. Verify Google Custom Search API is enabled
3. Check API quota in Google Cloud Console
4. Review server logs for errors

### Getting blocked?

- Use Google Custom Search API instead of scraping
- Reduce request frequency
- Use caching effectively

## Alternative: Agricultural Price APIs

For production use, consider integrating with:

1. **Agmarknet API** (Government of India)
   - Official agricultural prices
   - Free to use
   - Requires registration

2. **Commodity Online API**
   - Real-time commodity prices
   - Paid service

3. **Other Agricultural APIs**
   - Research available APIs for your region
   - Integrate similar to Google API

## Notes

- The system falls back to base prices if all methods fail
- Prices are cached to reduce API calls
- Database stores fetched prices for historical reference
- The service is designed to be resilient and always return a price
