const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schema for agricultural knowledge base entries
 */
const chatbotSchema = new Schema({
    // Question patterns that this entry can answer
    patterns: [String],
    
    // The type of agricultural query this addresses (now open-ended to allow any type)
    queryType: {
        type: String,
        trim: true,
        lowercase: true,
        default: 'general'
    },
    
    // Related crops this knowledge applies to
    crops: [String],
    
    // Regions/locations this knowledge is specific to (if any)
    regions: [String],
    
    // Seasons this knowledge is relevant for (if any)
    seasons: [String],
    
    // The actual knowledge content
    answer: {
        type: String,
        required: true
    },
    
    // Structured steps for procedures
    steps: [String],
    
    // Common assumptions made in this answer
    assumptions: [String],
    
    // Potential risks or warnings
    risks: [String],
    
    // Recommended next actions
    nextActions: [String],
    
    // Keywords for improved searching
    keywords: [String],
    
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    
    // Source of information
    source: String,
    
    // Verification status
    verified: {
        type: Boolean,
        default: false
    }
});

// Index for text search
chatbotSchema.index({ 
    patterns: 'text', 
    answer: 'text', 
    crops: 'text',
    keywords: 'text'
});

// Pre-save hook to update timestamps
chatbotSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

/**
 * Find the best answer for a given query
 */
chatbotSchema.statics.findAnswer = async function(query, userContext = {}) {
    const { location, season, crop } = userContext;
    const normalizedQuery = String(query || "").trim();

    // 1) Try exact/near pattern match
    const exactMatch = await this.findOne({
        patterns: { $regex: new RegExp(normalizedQuery, 'i') }
    });
    if (exactMatch) return exactMatch;

    // 2) Text search with context filters
    const searchQuery = { $text: { $search: normalizedQuery } };
    if (crop) searchQuery.crops = { $in: [crop] };
    if (location) searchQuery.regions = { $in: [location] };
    if (season) searchQuery.seasons = { $in: [season] };

    const textMatches = await this.find(
        searchQuery,
        { score: { $meta: "textScore" } }
    ).sort({ score: { $meta: "textScore" } }).limit(1);
    if (textMatches.length) return textMatches[0];

    // 3) Broad fuzzy search across patterns/answer/keywords/crops
    const tokens = normalizedQuery
        .toLowerCase()
        .split(/\W+/)
        .filter(Boolean)
        .slice(0, 6); // cap tokens to keep query lean

    if (tokens.length) {
        const regexes = tokens.map(t => new RegExp(t, 'i'));
        const broad = await this.findOne({
            $or: [
                { patterns: { $in: regexes } },
                { answer: { $in: regexes } },
                { keywords: { $in: regexes } },
                { crops: { $in: regexes } }
            ]
        });
        if (broad) return broad;
    }

    // 4) Fallback to a general answer
    const general = await this.findOne({ queryType: 'general' });
    return general || null;
};

/**
 * Get related knowledge entries
 */
chatbotSchema.statics.getRelatedEntries = async function(crops, queryType, limit = 3) {
    return this.find({
        crops: { $in: crops },
        queryType: queryType
    }).limit(limit);
};

const Chatbot = mongoose.model('Chatbot', chatbotSchema);

module.exports = Chatbot;