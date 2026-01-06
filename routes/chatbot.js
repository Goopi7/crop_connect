const express = require('express');
const router = express.Router();
const Chatbot = require('../models/chatbot');
const chatbotService = require('../services/chatbotService');
const { isLoggedIn } = require('../middleware');

// Get chatbot interface
router.get('/chatbot', isLoggedIn, (req, res) => {
    res.render('chatbot', { user: req.user });
});

// API endpoint to get answer
router.post('/api/chatbot/query', isLoggedIn, async (req, res) => {
    try {
        const { question, userContext } = req.body;
        
        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }
        
        // Use the enhanced chatbot service
        const response = await chatbotService.processQuery(question, userContext || {});
        
        // Log the query for analytics (if not already logged by the service)
        try {
            // Save the query to database for future training and analytics
            await new Chatbot({
                question: question,
                answer: response.answer,
                category: response.type || 'general',
                keywords: response.keywords || [],
                user_id: req.user._id,
                user_type: req.user.constructor.modelName,
                metadata: {
                    userContext,
                    queryType: response.type,
                    crops: response.crop ? [response.crop] : [],
                    success: response.success
                }
            }).save();
        } catch (logError) {
            console.error('Error logging chatbot query:', logError);
            // Continue with response even if logging fails
        }
        
        res.json(response);
    } catch (err) {
        console.error('Error processing chatbot query:', err);
        res.status(500).json({ 
            answer: "I'm having trouble processing your question right now. Please try again in a moment.",
            success: false,
            error: 'Failed to process your question',
            steps: [],
            assumptions: [
                "You're asking about agricultural information",
                "You need immediate assistance despite technical difficulties"
            ],
            risks: [
                "The system is currently experiencing technical issues",
                "You may need to try again later for a complete response"
            ],
            next_actions: [
                "Try rephrasing your question",
                "Try again in a few moments",
                "Check your internet connection"
            ]
        });
    }
});

// Seed initial chatbot data (admin only)
router.post('/api/chatbot/seed', isLoggedIn, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.modelName !== 'AdminLogin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Initial chatbot data
        const initialData = [
            {
                question: 'What crops grow well in rainy season?',
                answer: 'Crops that grow well in the rainy season include rice, corn, soybeans, and various vegetables like okra, cucumber, and leafy greens. These crops benefit from the abundant moisture.',
                category: 'planting',
                keywords: ['rainy', 'monsoon', 'wet', 'season', 'grow']
            },
            {
                question: 'How to prevent crop diseases?',
                answer: 'To prevent crop diseases: 1) Use disease-resistant varieties, 2) Practice crop rotation, 3) Ensure proper spacing for air circulation, 4) Apply appropriate fungicides when necessary, 5) Maintain field sanitation by removing infected plants.',
                category: 'diseases',
                keywords: ['disease', 'prevent', 'fungus', 'infection', 'rot']
            },
            {
                question: 'When is the best time to harvest wheat?',
                answer: 'The best time to harvest wheat is when the crop has reached physiological maturity, typically when the stalks and heads turn from green to golden yellow. The grain should be hard and not easily dented by fingernail.',
                category: 'harvesting',
                keywords: ['wheat', 'harvest', 'time', 'mature']
            },
            {
                question: 'What fertilizers are best for tomatoes?',
                answer: 'Tomatoes benefit from fertilizers rich in phosphorus and potassium. A balanced NPK ratio like 5-10-10 works well. Organic options include compost, well-rotted manure, and bone meal. Apply fertilizer when planting and again when fruits begin to form.',
                category: 'fertilizers',
                keywords: ['tomato', 'fertilizer', 'nutrient', 'NPK']
            },
            {
                question: 'How to get better prices for my crops?',
                answer: 'To get better prices: 1) Improve crop quality through proper cultivation practices, 2) Time your harvest based on market demand, 3) Consider value-added processing, 4) Explore direct marketing to consumers, 5) Join farmer cooperatives for collective bargaining.',
                category: 'pricing',
                keywords: ['price', 'market', 'sell', 'value', 'profit']
            },
            {
                question: 'What are the best practices for organic farming?',
                answer: 'Best practices for organic farming include: using natural compost and manure, implementing crop rotation, employing biological pest control, maintaining biodiversity, using organic seeds, and applying mulch for weed control and moisture retention.',
                category: 'general',
                keywords: ['organic', 'natural', 'chemical-free', 'sustainable']
            },
            {
                question: 'How to identify nutrient deficiencies in plants?',
                answer: 'Identify nutrient deficiencies by leaf symptoms: Nitrogen deficiency shows as yellowing of older leaves; Phosphorus deficiency appears as purple discoloration; Potassium deficiency shows as brown scorching on leaf edges; Calcium deficiency appears as distorted new growth; Magnesium deficiency shows as yellowing between leaf veins.',
                category: 'fertilizers',
                keywords: ['deficiency', 'nutrient', 'yellow', 'leaves', 'symptoms']
            },
            {
                question: 'When should I plant rice?',
                answer: 'Rice is typically planted at the beginning of the rainy season when there is adequate water for flooding the fields. In most regions, this is between May and July, depending on the monsoon arrival. For winter rice varieties, planting occurs in November-December.',
                category: 'planting',
                keywords: ['rice', 'plant', 'season', 'time']
            },
            {
                question: 'How to control pests without chemicals?',
                answer: 'Control pests naturally by: 1) Introducing beneficial insects like ladybugs and praying mantises, 2) Using neem oil or garlic spray, 3) Setting up physical barriers and traps, 4) Practicing companion planting, 5) Maintaining healthy soil to grow stronger plants that resist pests.',
                category: 'diseases',
                keywords: ['pest', 'insect', 'natural', 'control', 'organic']
            },
            {
                question: 'What is crop rotation and why is it important?',
                answer: 'Crop rotation is the practice of growing different types of crops in the same area across sequential seasons. It\'s important because it helps prevent soil depletion, breaks pest cycles, reduces pathogen buildup, improves soil structure, and can increase yield without requiring synthetic inputs.',
                category: 'general',
                keywords: ['rotation', 'sequence', 'soil', 'health']
            }
        ];
        
        // Clear existing data and insert new data
        await Chatbot.deleteMany({});
        await Chatbot.insertMany(initialData);
        
        res.json({ success: true, message: 'Chatbot data seeded successfully' });
    } catch (err) {
        console.error('Error seeding chatbot data:', err);
        res.status(500).json({ error: 'Failed to seed chatbot data' });
    }
});

module.exports = router;