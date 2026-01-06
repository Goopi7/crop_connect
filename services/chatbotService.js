const Chatbot = require('../models/chatbot');
const Crop = require('../models/cropModel');
const mongoose = require('mongoose');

class ChatbotService {
    constructor() {
        this.cropCache = null;
        this.lastCacheUpdate = null;
        this.cacheExpiryMinutes = 30;
    }

    /**
     * Process a user query and generate an expert response
     * @param {string} query - The user's question
     * @param {Object} userContext - Optional context about the user (location, etc.)
     * @returns {Object} - Response with answer, steps, assumptions, risks, and next actions
     */
    async processQuery(query, userContext = {}) {
        try {
            // Step 1: Determine query type and extract key entities
            const queryAnalysis = await this.analyzeQuery(query);
            
            // Step 2: Generate response based on query type
            let response;
            
            switch(queryAnalysis.type) {
                case 'procedure':
                    response = await this.generateProcedureResponse(queryAnalysis, userContext);
                    break;
                case 'pest_disease':
                    response = await this.generatePestDiseaseResponse(queryAnalysis, userContext);
                    break;
                case 'fertilizer':
                    response = await this.generateFertilizerResponse(queryAnalysis, userContext);
                    break;
                case 'market':
                    response = await this.generateMarketResponse(queryAnalysis, userContext);
                    break;
                case 'prediction':
                    response = await this.generatePredictionResponse(queryAnalysis, userContext);
                    break;
                case 'general':
                default:
                    response = await this.generateGeneralResponse(queryAnalysis, userContext);
            }
            
            // Step 3: Add structured information (steps, assumptions, risks, next actions)
            if (!response.steps) {
                response.steps = this.generateSteps(queryAnalysis, response, userContext);
            }
            
            if (!response.assumptions) {
                response.assumptions = this.generateAssumptions(queryAnalysis, userContext);
            }
            
            if (!response.risks) {
                response.risks = this.generateRisks(queryAnalysis, response, userContext);
            }
            
            if (!response.next_actions) {
                response.next_actions = this.generateNextActions(queryAnalysis, response, userContext);
            }
            
            // Step 4: Add follow-up suggestions
            response.followUpSuggestions = this.generateFollowUpSuggestions(queryAnalysis, response);
            
            // Step 5: Add clarifying questions if needed (limit to 3 max)
            if (response.needsMoreInfo) {
                response.clarifyingQuestions = this.generateClarifyingQuestions(queryAnalysis, userContext, 3);
            }
            
            return response;
        } catch (error) {
            console.error('Error processing chatbot query:', error);
            // Never say "I did not understand" - provide best effort response with assumptions
            return {
                answer: this.generateBestEffortResponse(query),
                success: true,
                assumptions: ["Limited information provided", "Using general agricultural knowledge"],
                steps: this.generateGenericSteps(query),
                risks: ["Advice may need adjustment based on specific conditions"],
                next_actions: ["Provide more details for tailored advice"],
                clarifyingQuestions: this.generateGenericClarifyingQuestions(query)
            };
        }
    }
    
    /**
     * Analyze the query to determine its type and extract entities
     */
    /**
     * Analyze the query to determine its type and extract entities
     * @param {string} query - The user's question
     * @returns {Object} - Analysis result with query type and extracted entities
     */
    async analyzeQuery(query) {
        const lowerQuery = query.toLowerCase();
        const result = {
            originalQuery: query,
            type: 'general',
            entities: {
                crops: [],
                locations: [],
                seasons: [],
                problems: [],
                actions: []
            },
            keywords: []
        };
        
        // Get all crops from database instead of hardcoding
        const allCrops = await this.getAllCrops();
        const cropNames = allCrops.map(crop => crop.name.toLowerCase());
        
        // Extract crop names dynamically from database
        for (const cropName of cropNames) {
            const cropRegex = new RegExp(`\\b${cropName}\\b`, 'gi');
            const matches = lowerQuery.match(cropRegex);
            if (matches) {
                result.entities.crops = [...new Set([...result.entities.crops, ...matches.map(m => m.toLowerCase())])];
            }
        }
        
        // Fallback to common crops if no match found
        if (result.entities.crops.length === 0) {
            const commonCropPatterns = [
                /\b(rice|wheat|corn|maize|cotton|sugarcane|potato|tomato|onion|garlic|soybean|groundnut|mustard|sunflower|sorghum|millet|barley|oats|pulses|lentil|chickpea|pigeon\s*pea|black\s*gram|green\s*gram|cowpea|beans|peas|vegetables|fruits|spices|turmeric|ginger|chilli|pepper|cardamom|cinnamon|clove|cumin|coriander|fenugreek)\b/gi
            ];
            
            commonCropPatterns.forEach(pattern => {
                const matches = lowerQuery.match(pattern);
                if (matches) {
                    result.entities.crops = [...new Set([...result.entities.crops, ...matches.map(m => m.toLowerCase())])];
                }
            });
        }
        
        // Extract seasons
        const seasonPatterns = [
            /\b(summer|winter|rainy|monsoon|spring|autumn|fall|kharif|rabi|zaid)\b/gi
        ];
        
        seasonPatterns.forEach(pattern => {
            const matches = lowerQuery.match(pattern);
            if (matches) {
                result.entities.seasons = [...new Set([...result.entities.seasons, ...matches.map(m => m.toLowerCase())])];
            }
        });
        
        // Extract problems/pests/diseases
        const problemPatterns = [
            /\b(pest|disease|insect|fungus|bacteria|virus|rot|blight|mildew|rust|wilt|spot|mosaic|yellowing|wilting|stunted|curling|aphid|mite|caterpillar|borer|weevil|bug|fly|beetle|nematode|deficiency|excess|drought|flood|waterlogging)\b/gi
        ];
        
        problemPatterns.forEach(pattern => {
            const matches = lowerQuery.match(pattern);
            if (matches) {
                result.entities.problems = [...new Set([...result.entities.problems, ...matches.map(m => m.toLowerCase())])];
            }
        });
        
        // Extract action words
        const actionPatterns = [
            /\b(grow|plant|sow|cultivate|harvest|irrigate|water|fertilize|spray|control|manage|prevent|treat|cure|identify|diagnose|increase|improve|enhance|boost|maximize|optimize|schedule|plan|prepare|process|store|sell|market|price)\b/gi
        ];
        
        actionPatterns.forEach(pattern => {
            const matches = lowerQuery.match(pattern);
            if (matches) {
                result.entities.actions = [...new Set([...result.entities.actions, ...matches.map(m => m.toLowerCase())])];
            }
        });
        
        // Determine query type
        if (lowerQuery.includes('procedure') || 
            lowerQuery.includes('how to grow') || 
            lowerQuery.includes('how to plant') || 
            lowerQuery.includes('how to cultivate') ||
            (result.entities.actions.some(a => ['grow', 'plant', 'sow', 'cultivate'].includes(a)) && 
             result.entities.crops.length > 0)) {
            result.type = 'procedure';
        } else if (result.entities.problems.length > 0 && 
                  (lowerQuery.includes('control') || 
                   lowerQuery.includes('manage') || 
                   lowerQuery.includes('treat') || 
                   lowerQuery.includes('prevent'))) {
            result.type = 'pest_disease';
        } else if (lowerQuery.includes('fertilizer') || 
                  lowerQuery.includes('nutrient') || 
                  lowerQuery.includes('manure') || 
                  lowerQuery.includes('compost') ||
                  lowerQuery.includes('npk')) {
            result.type = 'fertilizer';
        } else if (lowerQuery.includes('price') || 
                  lowerQuery.includes('market') || 
                  lowerQuery.includes('sell') || 
                  lowerQuery.includes('cost') ||
                  lowerQuery.includes('profit') ||
                  lowerQuery.includes('demand')) {
            result.type = 'market';
        }
        
        // Extract keywords for database matching
        result.keywords = [
            ...result.entities.crops,
            ...result.entities.seasons,
            ...result.entities.problems,
            ...result.entities.actions.filter(a => !['is', 'are', 'was', 'were', 'be', 'been', 'being'].includes(a))
        ];
        
        return result;
    }
    
    /**
     * Generate a response for crop growing procedures
     * @param {Object} queryAnalysis - The analyzed query
     * @param {Object} userContext - User context information
     * @returns {Object} - Structured response with procedure details
     */
    async generateProcedureResponse(queryAnalysis, userContext) {
        const { entities } = queryAnalysis;
        
        // If no crop is specified, we need more information
        if (entities.crops.length === 0) {
            return {
                answer: "I'd be happy to provide a growing procedure, but I need to know which crop you're interested in. Could you please specify the crop?",
                needsMoreInfo: true,
                missingInfo: ['crop'],
                clarifyingQuestions: [
                    "Which crop would you like to grow?",
                    "What is your location or growing region?",
                    "Which season are you planning to plant in?"
                ],
                assumptions: ["You're looking for a complete growing procedure"],
                steps: [],
                risks: ["Without crop information, I can't provide specific guidance"],
                next_actions: ["Specify the crop you want to grow"]
            };
        }
        
        const cropName = entities.crops[0]; // Use the first crop mentioned
        
        try {
            // Try to find the crop in our database
            const crop = await this.getCropByName(cropName);
            
            if (!crop) {
                // Try to find in chatbot database
                const chatbotResponse = await Chatbot.findAnswer(queryAnalysis.originalQuery, userContext);
                
                if (chatbotResponse) {
                    return {
                        answer: chatbotResponse.answer,
                        success: true,
                        crop: cropName,
                        needsMoreInfo: false,
                        steps: chatbotResponse.steps || this.generateGenericSteps(cropName),
                        assumptions: chatbotResponse.assumptions || this.generateAssumptions(queryAnalysis, userContext),
                        risks: chatbotResponse.risks || this.generateRisks(queryAnalysis, { crop: cropName }, userContext),
                        next_actions: chatbotResponse.nextActions || this.generateNextActions(queryAnalysis, { crop: cropName }, userContext)
                    };
                }
                
                // Generate a generic procedure based on common practices
                return this.generateGenericProcedure(cropName, entities.seasons[0], userContext.location);
            }
            
            // Generate a detailed procedure from the crop data
            let procedure = `Complete Procedure for Growing ${crop.name}\n\n`;
            
            // Add location-specific notes if available
            if (userContext.location && crop.regional_notes && crop.regional_notes[userContext.location]) {
                procedure += `Regional Notes for ${userContext.location}: ${crop.regional_notes[userContext.location]}\n\n`;
            }
            
            // Add season-specific information
            let season = entities.seasons.length > 0 ? entities.seasons[0] : null;
            if (!season && userContext.season) {
                season = userContext.season;
            }
            
            if (season) {
                const seasonInfo = crop.growing_seasons && crop.growing_seasons.includes(season) 
                    ? `${crop.name} is well-suited for ${season} season cultivation.`
                    : `Note: ${crop.name} is typically grown in ${crop.growing_seasons ? crop.growing_seasons.join(', ') : 'specific'} seasons, not in ${season}.`;
                
                procedure += `Season Information: ${seasonInfo}\n\n`;
            }
            
            // Create structured steps array
            const steps = [];
            
            // Land preparation
            steps.push(`Land Preparation: ${crop.land_preparation || 'Prepare the soil by plowing and leveling. Ensure good drainage.'}`);
            
            // Seed rate and spacing
            steps.push(`Seed Rate & Spacing: Use ${crop.seed_rate || '2-3 kg/acre'} with spacing of ${crop.spacing || 'appropriate spacing for the crop'}.`);
            
            // Sowing
            steps.push(`Sowing: ${crop.sowing_method || 'Sow seeds at appropriate depth based on seed size.'}`);
            
            // Fertilizer application
            steps.push(`Fertilizer Application: ${crop.fertilizer_schedule || 'Apply balanced NPK fertilizer based on soil test results.'}`);
            
            // Irrigation
            steps.push(`Irrigation: ${crop.irrigation_schedule || 'Maintain adequate soil moisture throughout the growing period.'}`);
            
            // Weed management
            steps.push(`Weed Management: ${crop.weed_management || 'Control weeds during early growth stages to reduce competition.'}`);
            
            // Pest and disease management
            steps.push(`Pest & Disease Management: Monitor regularly for pests and diseases. Use integrated pest management practices.`);
            
            // Harvesting
            steps.push(`Harvesting: Harvest when ${crop.harvest_indicators || 'the crop shows signs of maturity'}, typically ${crop.days_to_maturity ? `${crop.days_to_maturity.min}-${crop.days_to_maturity.max} days after sowing` : 'at appropriate maturity'}.`);
            
            // Post-harvest handling
            steps.push(`Post-Harvest Handling: ${crop.post_harvest || 'Properly dry, clean, and store the harvested produce to maintain quality.'}`);
            
            // Generate assumptions
            const assumptions = [
                userContext.location ? `You are farming in ${userContext.location}` : "You have access to typical farming resources",
                `You're growing ${crop.name} in ${season || 'an appropriate season'}`,
                crop.soil_type ? `You have ${crop.soil_type} soil` : "You have workable soil conditions",
                "You have basic farming knowledge and equipment"
            ];
            
            // Generate risks
            const risks = [
                crop.major_risks || "Weather fluctuations may affect crop performance",
                crop.pest_susceptibility || "Pest and disease outbreaks can occur if not monitored",
                "Market prices may fluctuate affecting profitability",
                "Improper management can reduce yield potential"
            ];
            
            // Generate next actions
            const nextActions = [
                "Conduct a soil test before planting",
                "Secure quality seeds from reliable sources",
                "Prepare a seasonal calendar for all operations",
                "Set up a monitoring schedule for pests and diseases",
                "Connect with local agricultural extension services for specific advice"
            ];
            
            return {
                answer: procedure,
                success: true,
                crop: crop.name,
                needsMoreInfo: false,
                steps: steps,
                assumptions: assumptions,
                risks: risks,
                next_actions: nextActions
            };
        } catch (error) {
            console.error('Error generating procedure response:', error);
            return this.generateBestEffortResponse(queryAnalysis.originalQuery, cropName);
        }
    }
            /**
     * Generate helper methods for structured responses
     */
    
    /**
     * Get all crops from the database
     * @returns {Array} - List of all crops
     */
    async getAllCrops() {
        try {
            // Check if we have a valid cache
            if (this.cropCache && this.lastCacheUpdate) {
                const now = new Date();
                const cacheAge = (now - this.lastCacheUpdate) / (1000 * 60); // in minutes
                
                if (cacheAge < this.cacheExpiryMinutes) {
                    return this.cropCache;
                }
            }
            
            // Fetch all crops from database
            const crops = await Crop.find({});
            
            // Update cache
            this.cropCache = crops;
            this.lastCacheUpdate = new Date();
            
            return crops;
        } catch (error) {
            console.error('Error fetching crops:', error);
            return [];
        }
    }
    
    
    
    /**
     * Generate steps for a procedure
     * @param {Object} queryAnalysis - The analyzed query
     * @param {Object} response - The current response
     * @param {Object} userContext - User context information
     * @returns {Array} - Array of steps
     */
    generateSteps(queryAnalysis, response, userContext) {
        const { entities } = queryAnalysis;
        const cropName = entities.crops.length > 0 ? entities.crops[0] : null;
        
        if (!cropName) {
            return [];
        }
        
        // Generic steps for any crop
        return [
            `Land Preparation: Prepare the soil by plowing and leveling. Ensure good drainage.`,
            `Seed Selection: Choose high-quality seeds suitable for your region.`,
            `Sowing: Plant seeds at appropriate depth and spacing.`,
            `Fertilizer Application: Apply balanced NPK fertilizer based on soil test results.`,
            `Irrigation: Maintain adequate soil moisture throughout the growing period.`,
            `Weed Management: Control weeds during early growth stages to reduce competition.`,
            `Pest & Disease Management: Monitor regularly for pests and diseases. Use integrated pest management practices.`,
            `Harvesting: Harvest when the crop shows signs of maturity.`,
            `Post-Harvest Handling: Properly dry, clean, and store the harvested produce to maintain quality.`
        ];
    }
    
    /**
     * Generate assumptions for a response
     * @param {Object} queryAnalysis - The analyzed query
     * @param {Object} userContext - User context information
     * @returns {Array} - Array of assumptions
     */
    generateAssumptions(queryAnalysis, userContext) {
        const { entities } = queryAnalysis;
        const assumptions = [
            "You have access to typical farming resources",
            "You have basic farming knowledge and equipment"
        ];
        
        if (userContext.location) {
            assumptions.push(`You are farming in ${userContext.location}`);
        }
        
        if (entities.crops.length > 0) {
            assumptions.push(`You're growing ${entities.crops[0]} in an appropriate season`);
        }
        
        if (userContext.soil_type) {
            assumptions.push(`You have ${userContext.soil_type} soil`);
        }
        
        return assumptions;
    }
    
    /**
     * Generate risks for a response
     * @param {Object} queryAnalysis - The analyzed query
     * @param {Object} response - The current response
     * @param {Object} userContext - User context information
     * @returns {Array} - Array of risks
     */
    generateRisks(queryAnalysis, response, userContext) {
        return [
            "Weather fluctuations may affect crop performance",
            "Pest and disease outbreaks can occur if not monitored",
            "Market prices may fluctuate affecting profitability",
            "Improper management can reduce yield potential"
        ];
    }
    
    /**
     * Generate next actions for a response
     * @param {Object} queryAnalysis - The analyzed query
     * @param {Object} response - The current response
     * @param {Object} userContext - User context information
     * @returns {Array} - Array of next actions
     */
    generateNextActions(queryAnalysis, response, userContext) {
        return [
            "Conduct a soil test before planting",
            "Secure quality seeds from reliable sources",
            "Prepare a seasonal calendar for all operations",
            "Set up a monitoring schedule for pests and diseases",
            "Connect with local agricultural extension services for specific advice"
        ];
    }
    
    /**
     * Generate clarifying questions
     * @param {Object} queryAnalysis - The analyzed query
     * @param {Object} userContext - User context information
     * @param {number} maxQuestions - Maximum number of questions to generate
     * @returns {Array} - Array of clarifying questions
     */
    generateClarifyingQuestions(queryAnalysis, userContext, maxQuestions = 3) {
        const questions = [];
        
        if (!queryAnalysis.entities.crops.length) {
            questions.push("Which crop are you interested in?");
        }
        
        if (!userContext.location) {
            questions.push("What is your location or growing region?");
        }
        
        if (!queryAnalysis.entities.seasons.length && !userContext.season) {
            questions.push("Which season are you planning to plant in?");
        }
        
        if (!userContext.soil_type) {
            questions.push("What type of soil do you have?");
        }
        
        if (!userContext.irrigation) {
            questions.push("Do you have access to irrigation?");
        }
        
        // Return only the specified maximum number of questions
        return questions.slice(0, maxQuestions);
    }
    
    /**
     * Generate follow-up suggestions
     * @param {Object} queryAnalysis - The analyzed query
     * @param {Object} response - The current response
     * @returns {Array} - Array of follow-up suggestions
     */
    generateFollowUpSuggestions(queryAnalysis, response) {
        const { entities } = queryAnalysis;
        const suggestions = [];
        
        if (entities.crops.length > 0) {
            const crop = entities.crops[0];
            suggestions.push(`Common pests and diseases in ${crop}`);
            suggestions.push(`Best fertilizers for ${crop}`);
            suggestions.push(`How to market ${crop} for best prices`);
        }
        
        if (queryAnalysis.type === 'procedure') {
            suggestions.push("Organic farming methods");
            suggestions.push("Water conservation techniques");
        } else if (queryAnalysis.type === 'pest_disease') {
            suggestions.push("Organic pest control methods");
            suggestions.push("Preventive measures for common diseases");
        } else if (queryAnalysis.type === 'fertilizer') {
            suggestions.push("Organic alternatives to chemical fertilizers");
            suggestions.push("Signs of nutrient deficiency in crops");
        }
        
        return suggestions;
    }
    
    /**
     * Generate a best effort response when specific information is not available
     * @param {string} query - The original query
     * @param {string} cropName - The crop name if available
     * @returns {Object} - Structured response with best effort information
     */
    generateBestEffortResponse(query, cropName = null) {
        let answer = "Based on the information provided, here's my best guidance: ";
        
        if (cropName) {
            answer += `For growing ${cropName}, you'll need to follow general agricultural practices. `;
        }
        
        answer += "I've made some assumptions to provide you with useful information, but please adjust based on your specific conditions.";
        
        const steps = this.generateGenericSteps(cropName);
        
        const assumptions = [
            "You have access to typical farming resources",
            "You have basic farming knowledge and equipment",
            "You're growing in an appropriate season for your region",
            "You have workable soil conditions"
        ];
        
        const risks = [
            "Weather fluctuations may affect crop performance",
            "Pest and disease outbreaks can occur if not monitored",
            "Market prices may fluctuate affecting profitability",
            "Advice may need adjustment based on your specific conditions"
        ];
        
        const nextActions = [
            "Provide more details for tailored advice",
            "Consult with local agricultural extension services",
            "Research specific varieties suitable for your region",
            "Consider conducting soil tests before planting"
        ];
        
        const clarifyingQuestions = [
            "What is your specific location or growing region?",
            "Which season are you planning to plant in?",
            "What type of soil do you have?",
            "Do you have access to irrigation?"
        ].slice(0, 3);
        
        return {
            answer,
            success: true,
            needsMoreInfo: true,
            steps,
            assumptions,
            risks,
            next_actions: nextActions,
            clarifyingQuestions
        };
    }
    
    /**
     * Generate generic steps for a crop
     * @param {string} cropName - The crop name
     * @returns {Array} - Array of generic steps
     */
    generateGenericSteps(cropName = null) {
        const cropSpecific = cropName ? ` for ${cropName}` : '';
        
        return [
            `Land Preparation: Prepare the soil by plowing and leveling. Ensure good drainage${cropSpecific}.`,
            `Seed Selection: Choose high-quality seeds suitable for your region${cropSpecific}.`,
            `Sowing: Plant seeds at appropriate depth and spacing${cropSpecific}.`,
            `Fertilizer Application: Apply balanced NPK fertilizer based on soil test results.`,
            `Irrigation: Maintain adequate soil moisture throughout the growing period.`,
            `Weed Management: Control weeds during early growth stages to reduce competition.`,
            `Pest & Disease Management: Monitor regularly for pests and diseases. Use integrated pest management practices.`,
            `Harvesting: Harvest when the crop shows signs of maturity.`,
            `Post-Harvest Handling: Properly dry, clean, and store the harvested produce to maintain quality.`
        ];
    }
    
    /**
     * Generate generic clarifying questions
     * @param {string} query - The original query
     * @returns {Array} - Array of generic clarifying questions
     */
    generateGenericClarifyingQuestions(query) {
        return [
            "Which crop are you interested in?",
            "What is your location or growing region?",
            "Which season are you planning to plant in?"
        ];
    }
    
    /**
     * Generate crop procedure response
     */
    async generateCropProcedureResponse(cropName, entities, userContext) {
        try {
            const crop = await this.findCrop(cropName);
            let procedure = `Here's how to grow ${crop.name}:\n\n`;
            
            // Add water requirement
            if (crop.water_need) {
                procedure += `- Water requirement: ${crop.water_need}\n`;
            }
            
            return {
                answer: procedure,
                success: true,
                crop: crop.name,
                needsMoreInfo: false,
                assumptions: {
                    soil_types: crop.soil_types,
                    ph_range: crop.ph_range,
                    water_need: crop.water_need
                }
            };
        } catch (error) {
            console.error(`Error generating procedure for ${cropName}:`, error);
            return this.generateGenericProcedure(cropName, entities.seasons[0], userContext.location);
        }
    }
    
    /**
     * Generate a response for pest and disease management
     */
    async generatePestDiseaseResponse(queryAnalysis, userContext) {
        const { entities } = queryAnalysis;
        
        // If no problem or crop is specified, we need more information
        if (entities.problems.length === 0) {
            return {
                answer: "I'd be happy to help with pest or disease management, but I need to know which specific issue you're dealing with. Could you please describe the problem or symptoms you're seeing?",
                needsMoreInfo: true,
                missingInfo: ['problem']
            };
        }
        
        const problem = entities.problems[0]; // Use the first problem mentioned
        const cropName = entities.crops.length > 0 ? entities.crops[0] : null;
        
        try {
            // If crop is specified, try to find specific pest/disease info
            if (cropName) {
                const crop = await this.getCropByName(cropName);
                
                if (crop && crop.pest_disease_profile && crop.pest_disease_profile.length > 0) {
                    // Find matching pest/disease
                    const matchingProblems = crop.pest_disease_profile.filter(item => {
                        return item.name.toLowerCase().includes(problem) || 
                               item.symptoms.some(s => s.toLowerCase().includes(problem));
                    });
                    
                    if (matchingProblems.length > 0) {
                        const pestDisease = matchingProblems[0];
                        
                        let response = `# Managing ${pestDisease.name} in ${crop.name}\n\n`;
                        response += `## Type\n${pestDisease.type}\n\n`;
                        response += `## Symptoms\n${pestDisease.symptoms.join(', ')}\n\n`;
                        response += "## Control Measures\n";
                        
                        pestDisease.control_measures.forEach(measure => {
                            response += `- ${measure}\n`;
                        });
                        
                        response += "\n## Monitoring Guidelines\n";
                        response += "Regular monitoring is essential for early detection and effective management:\n";
                        response += "- Inspect plants weekly during the growing season\n";
                        response += "- Focus on the undersides of leaves and new growth\n";
                        response += "- Look for early signs like discoloration, spots, or unusual growth patterns\n";
                        response += "- Set action thresholds: treat only when pest populations reach damaging levels\n";
                        
                        return {
                            answer: response,
                            success: true,
                            crop: crop.name,
                            problem: pestDisease.name,
                            needsMoreInfo: false
                        };
                    }
                }
            }
            
            // Try to find in chatbot database
            const chatbotResponse = await Chatbot.findAnswer(queryAnalysis.originalQuery);
            
            if (chatbotResponse && !chatbotResponse.includes("I'm sorry")) {
                return {
                    answer: chatbotResponse,
                    success: true,
                    problem: problem,
                    crop: cropName,
                    needsMoreInfo: false
                };
            }
            
            // Generate a generic pest/disease management response
            return this.generateGenericPestDiseaseManagement(problem, cropName);
        } catch (error) {
            console.error(`Error generating pest/disease management for ${problem}:`, error);
            return this.generateGenericPestDiseaseManagement(problem, cropName);
        }
    }
    
    /**
     * Generate a response for fertilizer recommendations
     */
    async generateFertilizerResponse(queryAnalysis, userContext) {
        const { entities } = queryAnalysis;
        const cropName = entities.crops.length > 0 ? entities.crops[0] : null;
        
        try {
            // If crop is specified, try to find specific fertilizer info
            if (cropName) {
                const crop = await this.getCropByName(cropName);
                
                if (crop && crop.fertilizer_schedule) {
                    let response = `# Fertilizer Recommendations for ${crop.name}\n\n`;
                    
                    response += "## NPK Requirements\n";
                    if (crop.fertilizer_schedule.npk_ratio) {
                        response += `The recommended NPK ratio for ${crop.name} is ${crop.fertilizer_schedule.npk_ratio}.\n\n`;
                    } else {
                        response += `${crop.name} generally requires a balanced fertilizer with nitrogen for leaf growth, phosphorus for root development, and potassium for overall plant health.\n\n`;
                    }
                    
                    response += "## Application Schedule\n";
                    if (crop.fertilizer_schedule.applications && crop.fertilizer_schedule.applications.length > 0) {
                        crop.fertilizer_schedule.applications.forEach((app, index) => {
                            response += `### ${index + 1}. ${app.stage}\n`;
                            response += `- Timing: ${app.timing}\n`;
                            response += `- Fertilizer: ${app.fertilizer}\n`;
                            response += `- Rate: ${app.rate}\n`;
                            if (app.method) {
                                response += `- Method: ${app.method}\n`;
                            }
                            response += "\n";
                        });
                    } else {
                        response += "- Base application: Apply well-rotted manure or compost before planting\n";
                        response += "- Starter fertilizer: Apply a balanced NPK fertilizer at planting\n";
                        response += "- Top dressing: Apply nitrogen-rich fertilizer during the vegetative growth stage\n\n";
                    }
                    
                    response += "## Organic Alternatives\n";
                    response += "- Compost: Apply well-decomposed compost at 5-10 tons per hectare before planting\n";
                    response += "- Vermicompost: Apply 2-3 tons per hectare\n";
                    response += "- Green manure: Grow leguminous crops and incorporate them into the soil\n";
                    response += "- Biofertilizers: Use rhizobium, azotobacter, or phosphate solubilizing bacteria\n\n";
                    
                    response += "## Tips for Efficient Fertilizer Use\n";
                    response += "- Conduct a soil test before applying fertilizers\n";
                    response += "- Apply fertilizers when the soil is moist\n";
                    response += "- Avoid applying fertilizers during heavy rainfall\n";
                    response += "- Follow the recommended rates to avoid over-fertilization\n";
                    response += "- Incorporate fertilizers into the soil to reduce losses\n";
                    
                    return {
                        answer: response,
                        success: true,
                        crop: crop.name,
                        needsMoreInfo: false
                    };
                }
            }
            
            // Try to find in chatbot database
            const chatbotResponse = await Chatbot.findAnswer(queryAnalysis.originalQuery);
            
            if (chatbotResponse && !chatbotResponse.includes("I'm sorry")) {
                return {
                    answer: chatbotResponse,
                    success: true,
                    crop: cropName,
                    needsMoreInfo: false
                };
            }
            
            // Generate a generic fertilizer recommendation
            return this.generateGenericFertilizerRecommendation(cropName);
        } catch (error) {
            console.error(`Error generating fertilizer recommendations for ${cropName}:`, error);
            return this.generateGenericFertilizerRecommendation(cropName);
        }
    }
    
    /**
     * Generate a response for market-related queries
     */
    async generateMarketResponse(queryAnalysis, userContext) {
        const { entities } = queryAnalysis;
        const cropName = entities.crops.length > 0 ? entities.crops[0] : null;
        
        try {
            // Try to find in chatbot database first
            const chatbotResponse = await Chatbot.findAnswer(queryAnalysis.originalQuery);
            
            if (chatbotResponse && !chatbotResponse.includes("I'm sorry")) {
                return {
                    answer: chatbotResponse,
                    success: true,
                    crop: cropName,
                    needsMoreInfo: false
                };
            }
            
            // Generate a generic market information response
            return this.generateGenericMarketInformation(cropName);
        } catch (error) {
            console.error(`Error generating market information for ${cropName}:`, error);
            return this.generateGenericMarketInformation(cropName);
        }
    }
    
    /**
     * Generate a response for general queries
     */
    async generateGeneralResponse(queryAnalysis, userContext) {
        try {
            // Try to find in chatbot database
            const chatbotResponse = await Chatbot.findAnswer(queryAnalysis.originalQuery);
            
            if (chatbotResponse && !chatbotResponse.includes("I'm sorry")) {
                return {
                    answer: chatbotResponse,
                    success: true,
                    needsMoreInfo: false
                };
            }
            
            // If no match in database, generate a helpful response
            const { entities, originalQuery } = queryAnalysis;
            
            if (entities.crops.length > 0) {
                const cropName = entities.crops[0];
                const crop = await this.getCropByName(cropName);
                
                if (crop) {
                    let response = `# Information about ${crop.name}\n\n`;
                    response += crop.description ? `${crop.description}\n\n` : '';
                    
                    response += "## Key Growing Information\n";
                    response += `- Climate zones: ${crop.climate_zones.join(', ')}\n`;
                    response += `- Growing seasons: ${crop.growing_seasons.join(', ')}\n`;
                    response += `- Soil types: ${crop.soil_types.join(', ')}\n`;
                    response += `- Water requirement: ${crop.water_need}\n`;
                    response += `- Days to maturity: ${crop.days_to_maturity.min}-${crop.days_to_maturity.max} days\n`;
                    response += `- Expected yield: ${crop.expected_yield.min}-${crop.expected_yield.max} ${crop.expected_yield.unit}\n\n`;
                    
                    response += "Would you like to know more about growing procedures, pest management, or fertilizer requirements for this crop?";
                    
                    return {
                        answer: response,
                        success: true,
                        crop: crop.name,
                        needsMoreInfo: false
                    };
                }
            }
            
            // If we still don't have a good response, provide a helpful fallback
            return {
                answer: this.generateHelpfulFallback(originalQuery, entities),
                success: true,
                needsMoreInfo: true
            };
        } catch (error) {
            console.error(`Error generating general response:`, error);
            return {
                answer: this.generateFallbackResponse(queryAnalysis.originalQuery),
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Generate follow-up suggestions based on the query and response
     */
    generateFollowUpSuggestions(queryAnalysis, response) {
        const suggestions = [];
        const { entities, type } = queryAnalysis;
        
        if (response.crop) {
            const cropName = response.crop;
            
            switch (type) {
                case 'procedure':
                    suggestions.push(`What are common pests and diseases in ${cropName}?`);
                    suggestions.push(`What fertilizers are best for ${cropName}?`);
                    suggestions.push(`What is the market price for ${cropName}?`);
                    break;
                case 'pest_disease':
                    suggestions.push(`What is the procedure to grow ${cropName}?`);
                    suggestions.push(`How to prevent diseases in ${cropName}?`);
                    suggestions.push(`What are organic pest control methods for ${cropName}?`);
                    break;
                case 'fertilizer':
                    suggestions.push(`What is the procedure to grow ${cropName}?`);
                    suggestions.push(`What are signs of nutrient deficiency in ${cropName}?`);
                    suggestions.push(`How to make organic fertilizer for ${cropName}?`);
                    break;
                case 'market':
                    suggestions.push(`What is the procedure to grow ${cropName}?`);
                    suggestions.push(`What are value-added products from ${cropName}?`);
                    suggestions.push(`How to store ${cropName} after harvest?`);
                    break;
                default:
                    suggestions.push(`What is the procedure to grow ${cropName}?`);
                    suggestions.push(`What are common pests and diseases in ${cropName}?`);
                    suggestions.push(`What fertilizers are best for ${cropName}?`);
            }
        } else {
            // General follow-up suggestions
            suggestions.push("What crops grow well in rainy season?");
            suggestions.push("How to improve soil fertility naturally?");
            suggestions.push("What are signs of nutrient deficiency in plants?");
        }
        
        return suggestions;
    }
    
    /**
     * Generate clarifying questions when more information is needed
     */
    generateClarifyingQuestions(queryAnalysis, userContext) {
        const questions = [];
        const { entities, type, missingInfo } = queryAnalysis;
        
        if (missingInfo && missingInfo.includes('crop')) {
            questions.push("Which specific crop are you interested in?");
        }
        
        if (missingInfo && missingInfo.includes('problem')) {
            questions.push("What symptoms or issues are you observing in your plants?");
        }
        
        if (!userContext.location) {
            questions.push("Which region or state are you farming in? This helps me provide location-specific advice.");
        }
        
        if (entities.crops.length > 0 && !entities.seasons.length > 0) {
            questions.push(`Which season are you planning to grow ${entities.crops[0]} in?`);
        }
        
        return questions.slice(0, 3); // Limit to 3 questions max
    }
    
    /**
     * Generate a helpful fallback response when no specific answer is found
     */
    generateHelpfulFallback(query, entities) {
        let response = "I understand you're asking about ";
        
        if (entities.crops.length > 0) {
            response += `${entities.crops.join(', ')}`;
        } else if (entities.problems.length > 0) {
            response += `managing ${entities.problems.join(', ')}`;
        } else {
            response += "agricultural practices";
        }
        
        response += ", but I need a bit more information to provide a specific answer.\n\n";
        
        response += "Here's what I can help you with:\n";
        response += "1. Detailed growing procedures for specific crops\n";
        response += "2. Pest and disease management strategies\n";
        response += "3. Fertilizer recommendations and schedules\n";
        response += "4. Market information and pricing trends\n";
        response += "5. General agricultural best practices\n\n";
        
        response += "Could you please provide more details about what specific information you're looking for?";
        
        return response;
    }
    
    /**
     * Generate a fallback response when an error occurs
     */
    generateFallbackResponse(query) {
        return `I understand you're asking about "${query}". While I don't have a specific answer for that, I'd be happy to help if you could provide more details or rephrase your question. I can provide information about crop growing procedures, pest and disease management, fertilizer recommendations, and market information. What specific aspect are you interested in?`;
    }
    
    /**
     * Generate a generic procedure for a crop when specific data is not available
     */
    generateGenericProcedure(cropName, season, location) {
        let procedure = `# General Procedure for Growing ${cropName}\n\n`;
        
        procedure += "## Land Preparation\n";
        procedure += "1. Clear the land of weeds and debris\n";
        procedure += "2. Plow the soil to a depth of 15-20 cm\n";
        procedure += "3. Add organic matter like compost or well-rotted manure\n";
        procedure += "4. Level the field for proper irrigation\n\n";
        
        procedure += "## Sowing\n";
        procedure += `1. Select high-quality ${cropName} seeds from a reliable source\n`;
        procedure += "2. Treat seeds with fungicide to prevent soil-borne diseases\n";
        procedure += "3. Sow seeds at the recommended spacing and depth\n";
        procedure += "4. Cover seeds with soil and lightly compact\n\n";
        
        procedure += "## Irrigation\n";
        procedure += "1. Provide adequate moisture for germination\n";
        procedure += "2. Maintain consistent soil moisture throughout the growing period\n";
        procedure += "3. Avoid waterlogging, which can lead to root diseases\n";
        procedure += "4. Reduce irrigation as the crop approaches maturity\n\n";
        
        procedure += "## Nutrient Management\n";
        procedure += "1. Apply base fertilizer before or during sowing\n";
        procedure += "2. Top-dress with nitrogen fertilizer during vegetative growth\n";
        procedure += "3. Apply micronutrients if deficiency symptoms appear\n";
        procedure += "4. Consider foliar sprays for quick nutrient uptake\n\n";
        
        procedure += "## Weed Management\n";
        procedure += "1. Remove weeds manually or use appropriate herbicides\n";
        procedure += "2. Maintain weed-free conditions, especially during early growth\n";
        procedure += "3. Consider mulching to suppress weed growth\n\n";
        
        procedure += "## Pest and Disease Management\n";
        procedure += "1. Monitor regularly for signs of pests and diseases\n";
        procedure += "2. Implement integrated pest management practices\n";
        procedure += "3. Use appropriate pesticides only when necessary\n";
        procedure += "4. Follow safe handling practices for all chemicals\n\n";
        
        procedure += "## Harvesting\n";
        procedure += `1. Harvest ${cropName} at the appropriate maturity stage\n`;
        procedure += "2. Use proper harvesting techniques to minimize damage\n";
        procedure += "3. Clean and sort the harvest to remove damaged produce\n";
        procedure += "4. Store in appropriate conditions to maintain quality\n\n";
        
        procedure += "## Note\n";
        procedure += `This is a general guide for growing ${cropName}. For more specific recommendations tailored to your local conditions, please consult with your local agricultural extension office or an agronomist.`;
        
        return {
            answer: procedure,
            success: true,
            crop: cropName,
            needsMoreInfo: true,
            assumptions: {
                soil_types: ['loam', 'sandy loam'],
                ph_range: { min: 6.0, max: 7.5 },
                water_need: 'moderate'
            }
        };
    }
    
    
    
    /**
     * Generate generic pest/disease management information
     */
    generateGenericPestDiseaseManagement(problem, cropName) {
        let response = cropName 
            ? `# Managing ${problem} in ${cropName}\n\n`
            : `# Managing ${problem} in Crops\n\n`;
        
        response += "## Integrated Pest Management Approach\n\n";
        
        response += "### 1. Prevention\n";
        response += "- Use resistant varieties when available\n";
        response += "- Practice crop rotation to break pest cycles\n";
        response += "- Maintain field sanitation by removing crop residues\n";
        response += "- Use disease-free seeds and planting materials\n";
        response += "- Optimize plant spacing for good air circulation\n";
        response += "- Time planting to avoid peak pest pressure\n\n";
        
        response += "### 2. Monitoring\n";
        response += "- Inspect plants regularly, at least weekly\n";
        response += "- Look for symptoms like discoloration, wilting, spots, or unusual growth\n";
        response += "- Check the undersides of leaves where pests often hide\n";
        response += "- Use sticky traps or pheromone traps to monitor insect populations\n";
        response += "- Set action thresholds: treat only when pest populations reach damaging levels\n\n";
        
        response += "### 3. Control Methods\n";
        
        response += "#### Cultural Controls\n";
        response += "- Remove and destroy infected plants\n";
        response += "- Adjust irrigation practices to avoid excess moisture\n";
        response += "- Improve soil drainage if needed\n";
        response += "- Use reflective mulches to repel certain insects\n\n";
        
        response += "#### Biological Controls\n";
        response += "- Introduce beneficial insects like ladybugs, lacewings, or parasitic wasps\n";
        response += "- Apply microbial pesticides containing Bacillus thuringiensis (Bt) or Trichoderma\n";
        response += "- Use neem oil or other botanical insecticides\n\n";
        
        response += "#### Chemical Controls (as a last resort)\n";
        response += "- Select the least toxic effective pesticide\n";
        response += "- Apply at the correct time and rate\n";
        response += "- Rotate pesticides with different modes of action to prevent resistance\n";
        response += "- Follow all safety precautions and pre-harvest intervals\n\n";
        
        response += "## Specific Management for Common Issues\n\n";
        
        if (problem.includes('aphid')) {
            response += "### Aphid Management\n";
            response += "- Spray strong jets of water to dislodge aphids\n";
            response += "- Apply insecticidal soap or neem oil\n";
            response += "- Release ladybugs or lacewings as natural predators\n";
            response += "- For severe infestations, consider systemic insecticides\n\n";
        } else if (problem.includes('mildew') || problem.includes('fungus') || problem.includes('rot') || problem.includes('blight')) {
            response += "### Fungal Disease Management\n";
            response += "- Improve air circulation by proper spacing and pruning\n";
            response += "- Avoid overhead irrigation; water at the base of plants\n";
            response += "- Apply copper-based fungicides or sulfur as preventatives\n";
            response += "- Remove and destroy infected plant parts\n";
            response += "- Apply compost tea to boost plant immunity\n\n";
        } else if (problem.includes('caterpillar') || problem.includes('borer') || problem.includes('worm')) {
            response += "### Caterpillar/Borer Management\n";
            response += "- Handpick and destroy caterpillars when population is low\n";
            response += "- Apply Bacillus thuringiensis (Bt), a microbial insecticide\n";
            response += "- Use pheromone traps to monitor and reduce adult populations\n";
            response += "- Apply neem oil or spinosad for organic control\n\n";
        } else if (problem.includes('virus') || problem.includes('mosaic')) {
            response += "### Viral Disease Management\n";
            response += "- There is no cure for viral diseases; focus on prevention\n";
            response += "- Remove and destroy infected plants immediately\n";
            response += "- Control insect vectors like aphids and whiteflies\n";
            response += "- Use virus-resistant varieties when available\n";
            response += "- Disinfect tools between plants to prevent spread\n\n";
        } else {
            response += "### General Pest Management\n";
            response += "- Identify the specific pest or disease for targeted control\n";
            response += "- Start with the least toxic control methods\n";
            response += "- Consider multiple approaches for effective management\n";
            response += "- Consult with local extension services for specific recommendations\n\n";
        }
        
        response += "## Organic Control Options\n";
        response += "- Neem oil: Effective against many insects and some fungal diseases\n";
        response += "- Insecticidal soap: Controls soft-bodied insects like aphids and mites\n";
        response += "- Diatomaceous earth: Controls crawling insects\n";
        response += "- Garlic or hot pepper spray: Repels many insects\n";
        response += "- Beneficial microorganisms: Trichoderma, Bacillus subtilis, and others can help control soil-borne diseases\n\n";
        
        response += "## Note\n";
        response += "This is general guidance for managing common crop pests and diseases. For severe or unusual problems, consider consulting with a local agricultural extension specialist for specific recommendations tailored to your situation.";
        
        return {
            answer: response,
            success: true,
            problem: problem,
            crop: cropName,
            needsMoreInfo: true
        };
    }
    
    /**
     * Generate generic fertilizer recommendations
     */
    generateGenericFertilizerRecommendation(cropName) {
        let response = cropName 
            ? `# Fertilizer Recommendations for ${cropName}\n\n`
            : "# General Fertilizer Recommendations for Crops\n\n";
        
        response += "## Understanding Plant Nutrients\n\n";
        
        response += "### Primary Nutrients (Macronutrients)\n";
        response += "- **Nitrogen (N)**: Essential for leaf and stem growth. Deficiency shows as yellowing of older leaves.\n";
        response += "- **Phosphorus (P)**: Important for root development, flowering, and fruiting. Deficiency appears as purple discoloration.\n";
        response += "- **Potassium (K)**: Enhances overall plant health and disease resistance. Deficiency shows as browning of leaf edges.\n\n";
        
        response += "### Secondary Nutrients\n";
        response += "- **Calcium (Ca)**: Essential for cell wall structure. Deficiency appears as distorted new growth.\n";
        response += "- **Magnesium (Mg)**: Central component of chlorophyll. Deficiency shows as interveinal yellowing.\n";
        response += "- **Sulfur (S)**: Important for protein synthesis. Deficiency appears as yellowing of new leaves.\n\n";
        
        response += "### Micronutrients\n";
        response += "- **Iron (Fe)**, **Manganese (Mn)**, **Zinc (Zn)**, **Copper (Cu)**, **Boron (B)**, **Molybdenum (Mo)**, and **Chlorine (Cl)** are needed in small amounts but are essential for plant health.\n\n";
        
        response += "## General Fertilizer Application Guidelines\n\n";
        
        response += "### Base Application (Before Planting)\n";
        response += "- Apply well-rotted manure or compost at 5-10 tons per hectare\n";
        response += "- Incorporate into the soil during land preparation\n";
        response += "- For most crops, apply a balanced NPK fertilizer (e.g., 10-10-10) at 200-300 kg/ha\n\n";
        
        response += "### Growth Stage Applications\n";
        response += "1. **Seedling Stage**: Light application of nitrogen-rich fertilizer to promote vegetative growth\n";
        response += "2. **Vegetative Stage**: Moderate application of balanced fertilizer with emphasis on nitrogen\n";
        response += "3. **Flowering/Fruiting Stage**: Reduce nitrogen and increase phosphorus and potassium\n";
        response += "4. **Maturity Stage**: Minimal fertilizer application, focus on potassium if needed\n\n";
        
        response += "## Organic Fertilizer Options\n";
        response += "- **Compost**: Balanced nutrition and improves soil structure\n";
        response += "- **Vermicompost**: Rich in nutrients and beneficial microorganisms\n";
        response += "- **Green Manure**: Growing leguminous crops and incorporating them into the soil\n";
        response += "- **Animal Manure**: Provides slow-release nutrients (must be well-composted)\n";
        response += "- **Bone Meal**: High in phosphorus, good for root development\n";
        response += "- **Wood Ash**: Contains potassium and raises soil pH\n";
        response += "- **Seaweed Extract**: Contains trace elements and growth stimulants\n\n";
        
        response += "## Application Methods\n";
        response += "- **Broadcasting**: Spreading fertilizer evenly over the entire field\n";
        response += "- **Band Placement**: Applying in bands near the plant rows\n";
        response += "- **Side Dressing**: Applying alongside growing plants\n";
        response += "- **Foliar Spray**: Applying liquid fertilizer directly to leaves\n";
        response += "- **Fertigation**: Applying through irrigation systems\n\n";
        
        response += "## Tips for Efficient Fertilizer Use\n";
        response += "- Conduct a soil test before applying fertilizers\n";
        response += "- Apply fertilizers when the soil is moist\n";
        response += "- Avoid applying fertilizers during heavy rainfall\n";
        response += "- Follow the recommended rates to avoid over-fertilization\n";
        response += "- Incorporate fertilizers into the soil to reduce losses\n\n";
        
        response += "## Signs of Nutrient Deficiency\n";
        response += "- **Nitrogen**: Yellowing of older leaves, stunted growth\n";
        response += "- **Phosphorus**: Purple discoloration, poor root development\n";
        response += "- **Potassium**: Brown scorching and curling of leaf tips\n";
        response += "- **Calcium**: Distorted or stunted new growth, blossom end rot\n";
        response += "- **Magnesium**: Interveinal yellowing, starting with older leaves\n";
        response += "- **Sulfur**: General yellowing of younger leaves\n";
        response += "- **Iron**: Interveinal yellowing of young leaves\n";
        response += "- **Zinc**: Small leaves, shortened internodes\n\n";
        
        response += "## Note\n";
        response += "This is general guidance for fertilizer application. For specific recommendations, consider conducting a soil test and consulting with a local agricultural extension specialist.";
        
        return {
            answer: response,
            success: true,
            crop: cropName,
            needsMoreInfo: true
        };
    }
    
    /**
     * Generate generic market information
     */
    generateGenericMarketInformation(cropName) {
        let response = cropName 
            ? `# Market Information for ${cropName}\n\n`
            : "# General Agricultural Market Information\n\n";
        
        response += "## Market Considerations\n\n";
        
        response += "### Factors Affecting Crop Prices\n";
        response += "- **Supply and Demand**: The fundamental driver of prices\n";
        response += "- **Seasonality**: Prices typically lower during harvest and higher during off-season\n";
        response += "- **Quality**: Higher grades command premium prices\n";
        response += "- **Market Access**: Proximity to markets affects transportation costs\n";
        response += "- **Storage Capacity**: Ability to store crops allows selling when prices are higher\n";
        response += "- **Government Policies**: Minimum support prices, import/export regulations\n";
        response += "- **Weather Events**: Droughts, floods affecting regional or global supply\n";
        response += "- **Global Market Trends**: International trade patterns and policies\n\n";
        
        response += "## Strategies to Improve Market Returns\n\n";
        
        response += "### Pre-Harvest Strategies\n";
        response += "1. **Market Research**: Understand demand patterns and price trends\n";
        response += "2. **Crop Selection**: Choose crops with strong market demand\n";
        response += "3. **Contract Farming**: Secure buyers before planting\n";
        response += "4. **Crop Insurance**: Protect against price and yield risks\n";
        response += "5. **Certification**: Consider organic or other certifications for premium prices\n\n";
        
        response += "### Post-Harvest Strategies\n";
        response += "1. **Proper Storage**: Maintain crop quality to command better prices\n";
        response += "2. **Grading and Sorting**: Separate produce by quality for different markets\n";
        response += "3. **Processing**: Add value through cleaning, drying, or basic processing\n";
        response += "4. **Collective Marketing**: Join farmer groups to increase bargaining power\n";
        response += "5. **Direct Marketing**: Sell directly to consumers when feasible\n\n";
        
        response += "### Value Addition Opportunities\n";
        response += "- **Primary Processing**: Cleaning, grading, packaging\n";
        response += "- **Secondary Processing**: Converting to shelf-stable products\n";
        response += "- **Branding**: Developing a reputation for quality\n";
        response += "- **Certification**: Organic, fair trade, or other certifications\n";
        response += "- **Direct Sales**: Farm-to-consumer marketing\n\n";
        
        response += "## Market Information Sources\n";
        response += "- Local agricultural extension offices\n";
        response += "- Agricultural market information systems\n";
        response += "- Farmer producer organizations\n";
        response += "- Mobile apps providing market prices\n";
        response += "- Agricultural newspapers and magazines\n";
        response += "- Radio and TV agricultural programs\n\n";
        
        response += "## Negotiation Tips with Buyers\n";
        response += "- Know current market prices before negotiating\n";
        response += "- Understand your production costs and minimum acceptable price\n";
        response += "- Highlight quality aspects of your produce\n";
        response += "- Consider volume discounts for larger sales\n";
        response += "- Build long-term relationships with reliable buyers\n";
        response += "- Get agreements in writing when possible\n\n";
        
        response += "## Note\n";
        response += "This is general market guidance. For current prices and specific market information, please check with local agricultural markets, extension services, or market information systems. Market conditions change frequently, so regular monitoring is essential for making informed decisions.";
        
        return {
            answer: response,
            success: true,
            crop: cropName,
            needsMoreInfo: true
        };
    }
    
    /**
     * Helper method to get a crop by name
     */
    async getCropByName(name) {
        try {
            // Check if we need to refresh the cache
            if (!this.cropCache || !this.lastCacheUpdate || 
                (new Date() - this.lastCacheUpdate) > (this.cacheExpiryMinutes * 60 * 1000)) {
                
                // Fetch all crops and cache them
                this.cropCache = await Crop.find({}).lean();
                this.lastCacheUpdate = new Date();
            }
            
            // Search in cache
            const normalizedName = name.toLowerCase().trim();
            
            // Try exact match first
            let crop = this.cropCache.find(c => 
                c.name.toLowerCase() === normalizedName ||
                (c.scientific_name && c.scientific_name.toLowerCase() === normalizedName)
            );
            
            // If no exact match, try partial match
            if (!crop) {
                crop = this.cropCache.find(c => 
                    c.name.toLowerCase().includes(normalizedName) ||
                    (c.scientific_name && c.scientific_name.toLowerCase().includes(normalizedName))
                );
            }
            
            return crop;
        } catch (error) {
            console.error(`Error getting crop by name (${name}):`, error);
            return null;
        }
    }
}

module.exports = new ChatbotService();