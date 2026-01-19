if (process.env.NODE_ENV != "production") {
    require('dotenv').config()
}


let express = require("express");
let app = express();

const mongoose = require('mongoose');
const ejsMate = require("ejs-mate");
const { serialize, deserialize } = require("v8");
let path = require("path");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


const methodOverride = require('method-override');
app.use(methodOverride('_method'));

app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));
// Default layout for all views (ejs-mate)
app.locals._layoutFile = 'layout/boilerplate';

// Serve local vendor assets (Bootstrap) from node_modules
try {
    const bootstrapPath = path.join(__dirname, 'node_modules', 'bootstrap', 'dist');
    app.use('/vendor/bootstrap', express.static(bootstrapPath));
} catch (_) {}


 let db_url=process.env.ATLASDB_URL;
 const defaultDbName = process.env.DB_NAME || "cropconnect";

function buildMongoUri(rawUrl) {
    if (!rawUrl) {
        return `mongodb://127.0.0.1:27017/${defaultDbName}`;
    }
    // If the URL ends with a trailing slash or has no explicit db segment, inject the db name before query params
    const hasDbPath = /\/[^/?]+(\?|$)/.test(rawUrl.replace(/^mongodb\+srv:\/\//, "mongodb://"));
    if (hasDbPath) return rawUrl;
    return rawUrl.replace(/\/(\?|$)/, `/${defaultDbName}$1`);
}

const mongoUri = buildMongoUri(db_url);

main().then((res) => {
    console.log(res);
})
    .catch((err) => {
        console.log(err);
    })

async function main() {
    await mongoose.connect(mongoUri, { dbName: defaultDbName });
    const usedDbName = mongoose.connection.name;
    return `✅ Connected to MongoDB Database (db: ${usedDbName})`;
}

//schemas
let FarmerLogin = require("./models/loginFarmer");
let { AvailableInventory, Inventory } = require("./models/totalInventorySchema.js");
let { SoldInventory } = require("./models/totalInventorySchema.js");
const BuyerLogin = require("./models/loginbuyer");
const AdminLogin = require("./models/loginAdmin");
const Request = require("./models/requestSchema.js");
const { CropPriceData } = require("./models/cropPriceModel.js");
const {isFarmer,isLoggedIn,isAdmin,isBuyer,hasAdminPermission}=require("./middleware.js");

// Routes
const adminRoutes = require('./routes/admin');
const chatbotRoutes = require('./routes/chatbot');
const apiRoutes = require('./routes/api');
const apiCropsRoutes = require('./routes/api/crops');
const cropsRoutes = require('./routes/crops');
const buyerOrdersRoutes = require('./routes/buyer/orders');

// Services
const { initScheduler } = require('./services/scheduler');


//session,flash,passport
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;


//joi schema validations
let {inventorySchema,userSchema}=require("./schema.js");




let port = 8080;
// Initialize price update scheduler
initScheduler();

app.listen(port, () => {
    console.log(port);
});
//session in production
const store = MongoStore.create({
    mongoUrl: mongoUri,
    crypto: {
        secret: process.env.SECRET || "devFallbackSecret"
        
    },
    touchAfter: 24 * 3600,
});


//session - cookies
const sessionsecret = {
    store,
    secret: process.env.SECRET || "devFallbackSecret",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    }
};
app.use(session(sessionsecret));
app.use(flash());


//middleware
const { redirectPath } = require("./middleware.js");

// Use routes will be mounted after passport initialization below
// const {isOwner}=require("./middleware.js");

app.use(passport.initialize());
app.use(passport.session());

// passport.use(new LocalStrategy(FarmerLogin.authenticate()));//-- it tells passport to use farmers

// passport.serializeUser(FarmerLogin.serializeUser());//stores users details in session --->  pbkdf2 hashing algo
// passport.deserializeUser(FarmerLogin.deserializeUser());//remove stored info of user when session is complete
// Register strategies
passport.use("farmer-local", new LocalStrategy(FarmerLogin.authenticate()));
passport.use("buyer-local", new LocalStrategy(BuyerLogin.authenticate()));
passport.use("admin-local", new LocalStrategy(AdminLogin.authenticate()));

// Custom serialize to store user type
passport.serializeUser(function (user, done) {
    done(null, { id: user.id, type: user.constructor.modelName });
});

// Deserialize depending on type
passport.deserializeUser(async function (obj, done) {
    let Model;
    switch(obj.type) {
        case "FarmerLogin":
            Model = FarmerLogin;
            break;
        case "BuyerLogin":
            Model = BuyerLogin;
            break;
        case "AdminLogin":
            Model = AdminLogin;
            break;
        default:
            return done(new Error("Unknown user type"));
    }
    const user = await Model.findById(obj.id);
    done(null, user);
});

//mapbox
let geocodingClient;
try {
    const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
    const map_token = process.env.MAP_TOKEN;
    
    if (map_token && map_token.startsWith('pk.')) {
        geocodingClient = mbxGeocoding({ accessToken: map_token });
        console.log('✅ Mapbox integration enabled');
    } else {
        console.log('⚠️  Mapbox token not provided or invalid - using mock geocoding');
        // Mock geocoding client for testing
        geocodingClient = {
            forwardGeocode: () => ({
                send: () => Promise.resolve({
                    body: {
                        features: [{
                            geometry: {
                                type: 'Point',
                                coordinates: [77.5946, 12.9716] // Bangalore coordinates
                            }
                        }]
                    }
                })
            })
        };
    }
} catch (error) {
    console.log('⚠️  Mapbox SDK error, using mock geocoding:', error.message);
    // Mock geocoding client
    geocodingClient = {
        forwardGeocode: () => ({
            send: () => Promise.resolve({
                body: {
                    features: [{
                        geometry: {
                            type: 'Point',
                            coordinates: [77.5946, 12.9716]
                        }
                    }]
                }
            })
        })
    };
}


let validateInventory=(req,res,next)=>{
    let {error}=inventorySchema.validate(req.body);
    // console.log(result);
    if(error){
        req.flash("error",error.message);
        const redirectpath1 = res.locals.redirect || "/listings/farmers";
        return res.redirect(redirectpath1);

    }
    else{
        next();
    }
}
let validateUser=(req,res,next)=>{
    let {error}=userSchema.validate(req.body);
    if(error){
        req.flash("error",error.message);
        const back = req.get('referer') || req.originalUrl || "/";
        return res.redirect(back);
    }
    next();
}


app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currentUser = req.user;
    try {
        res.locals.userType = req.user && req.user.constructor ? req.user.constructor.modelName : null;
    } catch (_) {
        res.locals.userType = null;
    }
    next();
});
app.get("/", (req, res) => {
    res.render("home.ejs", { hideRoleNav: true });
});

// Fertilizer advice UI
app.get('/advice/fertilizer', (req, res) => {
    const type = res.locals.userType;
    const layout = type === 'BuyerLogin' ? 'layout/buyer' : (type === 'FarmerLogin' ? 'layout/farmer' : 'layout/boilerplate');
    res.render('advice/fertilizer.ejs', { layout });
});

// Mount API routers (after passport so session/auth is available)
app.use('/api', apiRoutes);
app.use('/api/crops', apiCropsRoutes);
app.use(cropsRoutes);
app.use('/admin', adminRoutes);
app.use(chatbotRoutes);
app.use('/buyer/api', buyerOrdersRoutes);

// Buyer payment page route (after middleware setup)
app.get('/buyer/payment/:id', isLoggedIn, isBuyer, async (req, res) => {
    try {
        const Order = require('./models/order');
        const order = await Order.findById(req.params.id).populate('farmer');
        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/dashboard/buyer');
        }
        if (String(order.buyer) !== String(req.user._id)) {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/dashboard/buyer');
        }
        if (order.status !== 'created') {
            req.flash('info', `Order is already ${order.status}`);
            return res.redirect('/dashboard/buyer');
        }
        res.render('buyer/payment', { order });
    } catch (err) {
        console.error('Payment page error:', err);
        req.flash('error', 'Failed to load payment page');
        res.redirect('/dashboard/buyer');
    }
});

// DEV ONLY: create a dummy admin for quick testing
if (process.env.NODE_ENV !== 'production') {
app.post("/dev/create-admin", async (req, res) => {
    try {
        const username = req.body.username || "admindemo";
        const password = req.body.password || "Secret123";
        const email = req.body.email || "admindemo@gmail.com";
        const name = req.body.name || "Admin Demo";
        const role = req.body.role || "admin";

        let existing = await AdminLogin.findOne({ username });
        if (existing) {
            return res.status(200).json({ ok: true, note: "existing", username });
        }
        const admin = new AdminLogin({ name, username, email, role });
        await AdminLogin.register(admin, password);
        return res.status(201).json({ ok: true, created: { username, email, role } });
    } catch (e) {
        console.error("dev create-admin error", e);
        return res.status(500).json({ ok: false, error: e.message });
    }
});

// Seed sample data for dashboard verification
app.post('/dev/seed-sample', async (req, res) => {
    try {
        const farmer = await FarmerLogin.register(new FarmerLogin({
            username: 'farmerdemo',
            name: 'Farmer Demo',
            location: 'Demo Village'
        }), 'Secret123');

        const buyer = await BuyerLogin.register(new BuyerLogin({
            username: 'buyerdemo',
            name: 'Buyer Demo',
            email: 'buyer@example.com'
        }), 'Secret123');

        const sold = new SoldInventory({
            farmer: farmer._id,
            inventory: [
                { crop: 'Tomato', quantity: 100, price: 20 },
                { crop: 'Onion', quantity: 80, price: 25 }
            ]
        });
        await sold.save();

        res.json({ success: true, farmer: farmer.username, buyer: buyer.username, transaction: sold._id });
    } catch (e) {
        console.error('Seed error:', e);
        res.status(500).json({ success: false, error: 'Seed failed', details: e.message });
    }
});

// Auto-create admin account if none exists
(async () => {
    try {
        const adminCount = await AdminLogin.countDocuments();
        if (adminCount === 0) {
            const username = "admin";
            const password = "admin123";
            const email = "admin@example.com";
            const name = "Admin User";
            const role = "superadmin";
            
            const admin = new AdminLogin({ name, username, email, role });
            await AdminLogin.register(admin, password);
            console.log("✅ Default admin account created:", { username, email, role });
            console.log("   Login at: http://localhost:8080/users/loginadmin");
        }
    } catch (e) {
        console.error("❌ Error creating default admin:", e);
    }
})();
}

// Crop Advisor recommendation endpoint
app.post("/advisor/recommend", isFarmer, async (req, res) => {
    try {
        const {
            soil_type, irrigation, soil_ph,
            nitrogen, phosphorus, potassium,
            land_size, season, location
        } = req.body;

        // Validate required fields
        if (!soil_type) {
            req.flash('error', 'Soil type is required for accurate recommendations');
            return res.redirect('/listings/farmers');
        }

        // Map irrigation to water_availability
        const water_availability = irrigation === 'yes' ? 'high' : (irrigation === 'no' ? 'low' : 'medium');

        // Get farmer location if not provided
        const farmerLocation = location || req.user.location || '';

        // Use the improved recommendation system
        const Crop = require('./models/cropModel');
        const result = await Crop.getRecommendations({
            location: farmerLocation,
            soil_type: soil_type,
            ph: soil_ph ? parseFloat(soil_ph) : undefined,
            rainfall: undefined, // Can be derived from location
            plot_size: land_size ? parseFloat(land_size) : undefined,
            season: season || undefined,
            budget_level: undefined,
            risk_preference: undefined,
            crop_category: undefined,
            water_availability: water_availability,
            temperature: undefined, // Can be derived from location
            experience_level: undefined,
            market_distance: undefined
        });

        // Format recommendations for display
        const recos = (result.recommendations || []).slice(0, 5).map(item => {
            const crop = item.crop;
            const cropName = crop.name.toLowerCase();
            
            // Get price data for display
            const basePrices = { wheat: 25, rice: 35, corn: 20, tomato: 45, potato: 15, onion: 30, soybean: 55, cotton: 80 };
            const expectedPrice = basePrices[cropName] || 30;
            
            // Format growing process from crop data
            const process = [];
            if (crop.planting_details) {
                process.push(`Sowing: ${crop.planting_details.seed_rate?.value || '-'} ${crop.planting_details.seed_rate?.unit || ''} per ${crop.planting_details.seed_rate?.unit === 'kg' ? 'acre' : 'unit'}`);
            }
            if (crop.nutrient_management) {
                process.push(`Nutrient Management: Apply fertilizers as per schedule`);
            }
            if (crop.water_requirements) {
                process.push(`Irrigation: ${crop.water_requirements.irrigation_schedule?.frequency || 'As per soil moisture'}`);
            }
            process.push(`Pest & Disease: Monitor regularly and follow IPM`);
            process.push(`Harvest: ${crop.harvesting?.days_to_maturity?.min || '-'}-${crop.harvesting?.days_to_maturity?.max || '-'} days to maturity`);

            // Format fertilizers from nutrient management
            const fertilizers = [];
            if (crop.nutrient_management) {
                const n = crop.nutrient_management.nitrogen?.requirement;
                const p = crop.nutrient_management.phosphorus?.requirement;
                const k = crop.nutrient_management.potassium?.requirement;
                
                if (n) fertilizers.push({ name: 'Nitrogen (N)', quantity: `${n.value || '-'} ${n.unit || 'kg/ha'}` });
                if (p) fertilizers.push({ name: 'Phosphorus (P)', quantity: `${p.value || '-'} ${p.unit || 'kg/ha'}` });
                if (k) fertilizers.push({ name: 'Potassium (K)', quantity: `${k.value || '-'} ${k.unit || 'kg/ha'}` });
            }

            // Calculate expected yield
            const yieldRange = crop.harvesting?.expected_yield;
            const expectedYield = yieldRange 
                ? `${yieldRange.min || '-'}-${yieldRange.max || '-'} ${yieldRange.unit || 'kg/ha'}`
                : 'Varies by management';

            return {
                crop: cropName,
                score: item.score,
                score_breakdown: item.breakdown || {},
                expectedYield: expectedYield,
                expectedPrice: expectedPrice,
                process: process,
                fertilizers: fertilizers.length > 0 ? fertilizers : [
                    { name: 'NPK', quantity: 'As per soil test recommendation' }
                ],
                why: item.why || [],
                accuracy: result.accuracy || 'Medium'
            };
        });

        // Re-render farmer dashboard with recommendations
        const farmerId = req.user._id;
        let available = await AvailableInventory.findOne({ farmer: farmerId });
        if (!available) available = { inventory: [] };
        let sold = await SoldInventory.findOne({ farmer: farmerId });
        if (!sold) sold = { inventory: [] };
        const pendingRequests = await Request.find({ farmer: farmerId, order: 'pending' });
        const hasPending = pendingRequests.length > 0;

        res.render('listings/farmers', {
            available, sold, hasPending,
            suggestedCrop: recos[0]?.crop || null, 
            suggestedAvg: recos[0]?.expectedPrice || null, 
            fertilizerTips: recos[0]?.why?.slice(0, 3) || [],
            fertilizerPlan: recos[0]?.fertilizers || null, 
            growSteps: recos[0]?.process || null,
            recommendations: recos,
            recommendationAccuracy: result.accuracy || 'Medium',
            recommendationCount: result.recommendations_count || recos.length
        });
    } catch (e) {
        console.error('Advisor recommend error:', e);
        req.flash('error', e.message || 'Failed to generate recommendations');
        res.redirect('/listings/farmers');
    }
});

// Admin routes
app.get("/users/loginadmin", (req, res) => {
    res.render("users/loginadmin.ejs");
});

app.get("/users/signupadmin", (req, res) => {
    res.render("users/signupadmin.ejs");
});

app.post("/users/signupadmin", async (req, res, next) => {
    try {
        let { name, username, password, email, role } = req.body;
        if (!name || !username || !email || !password) {
            req.flash("error", "Please fill in name, username, email and password");
            return res.redirect("/users/signupadmin");
        }
        let newAdmin = new AdminLogin({
            name: name,
            username: username,
            email: email,
            role: role || 'admin'
        });
        let test = await AdminLogin.register(newAdmin, password);
        console.log("✅ Admin created:", { id: test._id, username: test.username, email: test.email, role: test.role });
        req.login(test, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to Admin Dashboard");
            res.redirect("/admin/dashboard");
        })
    }
    catch (err) {
        console.error("❌ Admin signup error:", err);
        req.flash("error", err.message || "Failed to create admin");
        res.redirect("/users/signupadmin");
    }
});

app.post("/users/loginadmin", function(req, res, next) {
    passport.authenticate("admin-local", function(err, user, info) {
        if (err) { 
            console.error("Admin login error:", err);
            req.flash("error", "An error occurred during login");
            return res.redirect("/users/loginadmin"); 
        }
        if (!user) { 
            req.flash("error", info.message || "Invalid username or password");
            return res.redirect("/users/loginadmin"); 
        }
        req.logIn(user, function(err) {
            if (err) { 
                console.error("Admin login session error:", err);
                req.flash("error", "Failed to establish login session");
                return res.redirect("/users/loginadmin"); 
            }
            // Update last login timestamp
            if (user.updateLastLogin) {
                user.updateLastLogin().catch(err => console.error("Failed to update last login:", err));
            }
            req.flash("success", "Welcome to Admin Dashboard");
            return res.redirect("/admin/dashboard");
        });
    })(req, res, next);
});

// Admin dashboard
app.get("/admin/dashboard", isAdmin, async (req, res) => {
    try {
        
        const adminName = req.user.username;
        const adminRole = req.user.role;
        
        // Get system statistics
        const totalFarmers = await FarmerLogin.countDocuments();
        const totalBuyers = await BuyerLogin.countDocuments();
        const totalRequests = await Request.countDocuments();
        const pendingRequests = await Request.countDocuments({ order: "pending" });
        
        res.render("admin/dashboard.ejs", { 
            adminName, 
            adminRole,
            stats: {
                totalFarmers,
                totalBuyers,
                totalRequests,
                pendingRequests
            }
        });
    }
    catch (err) {
        req.flash("error", err.message);
        res.redirect("/");
    }
});

// Admin logout
app.get("/logoutadmin", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "Logged out successfully");
        res.redirect("/");
    });
});


app.get("/listings/farmers",isFarmer,async (req, res) => {
    try {
        const farmerId = req.user._id;
        let available = await AvailableInventory.findOne({ farmer: farmerId });
        if (!available) available = { inventory: [] };

        let sold = await SoldInventory.findOne({ farmer: farmerId });
        if (!sold) sold = { inventory: [] };
        const pendingRequests = await Request.find({ farmer: farmerId, order: "pending" });
        const hasPending = pendingRequests.length > 0;
        // Suggest a crop based on highest recent average price
        const candidateCrops = ['wheat','rice','corn','tomato','potato','onion','soybean','cotton'];
        const locationId = "LOC001";
        let best = { crop: null, avg: -1 };
        for (const c of candidateCrops) {
            const data = await CropPriceData.getAveragePrice(c, locationId, 30);
            const avg = data && data[0] ? data[0].avgPrice : null;
            if (avg && avg > best.avg) best = { crop: c, avg };
        }

        // Fallback when no historical data exists: choose by typical market base price
        if (!best.crop) {
            const basePrices = { wheat: 25, rice: 35, corn: 20, tomato: 45, potato: 15, onion: 30, soybean: 55, cotton: 80 };
            let chosen = null; let price = -1;
            for (const c of candidateCrops) {
                const p = basePrices[c] || 0;
                if (p > price) { chosen = c; price = p; }
            }
            best = { crop: chosen, avg: price };
        }

        // Build simple grow steps and fertilizer plan
        const growGuides = {
            wheat: [
                "Prepare well-drained loamy soil; pH 6.0–7.5",
                "Sow certified seeds at 4–5 cm depth",
                "Irrigate at crown root initiation and heading",
                "Weed at 20–25 days and 40–45 days",
                "Harvest when grains hard and straw turns yellow"
            ],
            rice: [
                "Puddle field; maintain standing water 2–3 cm",
                "Transplant 20–25 day seedlings",
                "Apply split N at tillering and panicle initiation",
                "Maintain water, drain before harvest",
                "Harvest at 20–24% grain moisture"
            ],
            corn: [
                "Well-drained fertile soil; pH 5.8–7.0",
                "Sow 3–5 cm deep, proper spacing",
                "Top-dress N at knee-high and pre-tassel",
                "Irrigate at tasseling and grain fill",
                "Harvest at black-layer maturity"
            ]
        };
        const defaultRules = {
            wheat: { N:120, P:60, K:40 },
            rice:  { N:100, P:50, K:50 },
            corn:  { N:140, P:70, K:60 },
            tomato:{ N:150, P:80, K:200 },
            potato:{ N:120, P:90, K:150 },
            onion: { N:100, P:50, K:50 },
            soybean:{ N:40,  P:60, K:70 },
            cotton:{ N:120, P:60, K:60 }
        };
        const splitAdvice = {
            wheat: "N: Basal 50%, CRI 25%, tillering 25%",
            rice:  "N: Basal 40%, tillering 30%, panicle 30%",
            corn:  "N: Basal 30%, knee-high 40%, pre-tassel 30%"
        };
        let fertilizerPlan = null;
        let growSteps = null;
        if (best.crop) {
            const r = defaultRules[best.crop] || defaultRules.wheat;
            fertilizerPlan = [
                { nutrient: 'N', amountKgPerHa: r.N, note: splitAdvice[best.crop] || 'Apply in 2–3 splits' },
                { nutrient: 'P', amountKgPerHa: r.P, note: 'Basal application at sowing/transplanting' },
                { nutrient: 'K', amountKgPerHa: r.K, note: 'Basal, or 50% basal + 50% at flowering for fruit crops' }
            ];
            growSteps = growGuides[best.crop] || growGuides.wheat;
        }

        res.render("listings/farmers", { 
            available, sold ,hasPending, 
            suggestedCrop: best.crop, 
            suggestedAvg: best.avg, 
            fertilizerTips: best.crop ? [
                `Recommended crop: ${best.crop} (30d avg price: ₹${Math.round(best.avg)}/kg)`,
                `Apply split doses and consider soil pH before application.`
            ] : [],
            fertilizerPlan,
            growSteps,
            recommendations: []
        });
    }
    catch (err) {
        req.flash("error",err.message);
        res.redirect("/");
    }

});

//farmers
app.get("/users/loginfarmer", (req, res) => {
    res.render("users/loginfarmer.ejs");
});

app.get("/users/signupfarmer", (req, res) => {
    res.render("users/signupfarmer.ejs");
});

//signup
app.post("/users/signupfarmer",validateUser, async (req, res, next) => {
    try {
        let { name, username, password, email, location } = req.body;
        let newFarmer = new FarmerLogin({
            name,
            username: username,
            email: email,
            location: location
        });
        let test = await FarmerLogin.register(newFarmer, password);
        req.login(test, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to Farmers Dashboard");
            res.redirect("/listings/farmers");
        })
    }
    catch (err) {
        req.flash("error", err.message);
        res.redirect("/users/signupfarmer");
    }

});

app.post("/users/loginfarmer", redirectPath, passport.authenticate("farmer-local", { failureRedirect: "/users/signupfarmer", failureFlash: true }), async (req, res) => {
    req.flash("success", "Welcome to Farmers DashBoard");
    let redirectpath1 = res.locals.redirect || "/listings/farmers";
    res.redirect(redirectpath1);;
});

//add inventory
app.get("/listings/addInventory",isFarmer, (req, res) => {
    res.render("listings/addInventory")
});

// Import Google Price Service
const googlePriceService = require('./services/googlePriceService');

// API endpoint to get market price for a crop
app.get("/api/market-price/:cropName", isFarmer, async (req, res) => {
    try {
        const cropName = req.params.cropName.toLowerCase();
        const location = req.query.location || 'India'; // Optional location parameter
        
        // Use Google Price Service to fetch real-time prices
        const marketPrice = await googlePriceService.getMarketPrice(cropName, location);
        
        res.json({ 
            success: true, 
            marketPrice, 
            cropName,
            source: 'google',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error("Error fetching market price:", err);
        // Return fallback price on error
        const basePrices = {
            wheat: 25, rice: 35, corn: 20, tomato: 45,
            potato: 15, onion: 30, soybean: 55, cotton: 80,
            maize: 20, sugarcane: 35, groundnut: 60, mustard: 50
        };
        const cropName = req.params.cropName.toLowerCase();
        res.json({ 
            success: true, 
            marketPrice: basePrices[cropName] || 30, 
            cropName,
            source: 'fallback',
            timestamp: new Date().toISOString()
        });
    }
});
//add inventory post

app.post("/listings/addInventory",validateInventory, isFarmer,async (req, res) => {
    let { crop, price, quantity, priceReason, marketPrice } = req.body;
    try {
        const farmerId = req.user._id;
        if (!crop || !price || !quantity) {
            req.flash("error", "All fields are required.");
            return res.redirect("/listings/addInventory");
        }
        crop = crop.toLowerCase();
        const priceNum = Number(price);
        const marketPriceNum = marketPrice ? Number(marketPrice) : null;
        
        // If price is higher than market price and no reason provided, require reason
        if (marketPriceNum && priceNum > marketPriceNum && !priceReason) {
            req.flash("error", "Please provide a reason for pricing higher than market price.");
            return res.redirect("/listings/addInventory");
        }
        
        let available = await AvailableInventory.findOne({ farmer: farmerId });
        const inventoryItem = {
            crop: crop,
            price: priceNum,
            quantity: Number(quantity)
        };
        
        // Add market price and reason if provided
        if (marketPriceNum) {
            inventoryItem.marketPrice = marketPriceNum;
        }
        if (priceReason) {
            inventoryItem.priceReason = priceReason.trim();
        }
        
        if (!available) {
            available = new AvailableInventory({
                farmer: farmerId,
                inventory: [inventoryItem]
            });
        } else {
            let cropFound = false;
            for (let item of available.inventory) {
                if (item.crop === crop && item.price === priceNum) {
                    item.quantity += Number(quantity);
                    cropFound = true;
                    break;
                }
            }
            if (!cropFound) {
                available.inventory.push(inventoryItem);
            }
        }

        await available.save();
        req.flash("success", "Inventory added successfully!");
        res.redirect("/listings/farmers");

    } catch (err) {
        console.error("Error updating inventory:", err);
        req.flash("error", "Something went wrong while adding inventory.");
        res.redirect("/");
    }
});

//update
app.get("/listings/update", isFarmer,async (req, res) => {
    let farmerId = req.user._id;
    let available = await AvailableInventory.findOne({ farmer: farmerId });
    res.render("listings/update", { available });
});

//post update one 
app.patch("/listings/update/:crop",isFarmer, async (req, res) => {
    try {
        let farmerId = req.user._id;
        let crop = req.params.crop;
        let { quantity, price } = req.body;
        await AvailableInventory.updateOne(
            { farmer: farmerId, "inventory.crop": crop },
            {
                $set: {
                    "inventory.$.quantity": quantity,
                    "inventory.$.price": price
                }
            }
        );
        res.redirect("/listings/farmers");
    }
    catch (err) {
        console.error("Error updating inventory:", err);
        req.flash("error", "Something went wrong while Updating inventory.");
        res.redirect("/listings/farmers");
    }
});

//delete one

app.get("/listings/delete/:crop",isFarmer, async (req, res) => {
    try {
        let farmerId = req.user._id;
        let crop = req.params.crop;
        await AvailableInventory.updateOne(
            { farmer: farmerId },
            { $pull: { inventory: { crop: crop } } }
        );
        res.redirect("/listings/farmers");
    }
    catch (err) {
        console.error("Error Deleting inventory:", err);
        req.flash("error", "Something went wrong while Deleting inventory.");
        res.redirect("/listings/farmers");
    }

});

// Update farmer's Razorpay.me account (farmer can update their own)
app.put("/farmer/api/payment-account", isFarmer, async (req, res) => {
    try {
        const farmerId = req.user._id;
        const { razorpayMeUsername, phone, bankAccount } = req.body;
        
        const update = {};
        if (razorpayMeUsername !== undefined && razorpayMeUsername.trim()) {
            update.razorpayMeUsername = razorpayMeUsername.trim().replace('@', ''); // Remove @ if present
        }
        if (phone !== undefined) update.phone = phone;
        if (bankAccount !== undefined) update.bankAccount = bankAccount;
        
        const farmer = await FarmerLogin.findByIdAndUpdate(farmerId, update, { new: true, runValidators: true });
        if (!farmer) {
            return res.status(404).json({ success: false, message: 'Farmer not found' });
        }
        
        req.flash("success", "Payment account updated successfully");
        res.json({ success: true, farmer });
    } catch (err) {
        console.error('Error updating farmer payment account:', err);
        res.status(500).json({ success: false, message: 'Failed to update payment account', details: err.message });
    }
});

//login buyer
app.get("/users/loginbuyer",async (req, res) => {
    res.render("users/loginbuyer.ejs");
})

//buyer dashboard
app.get("/listings/buyer",isLoggedIn,isBuyer,async (req, res) => {
    try{
      let buyerId=req.user._id;
      let buyername=req.user.username;
      let requests=await Request.find({buyer:buyerId}).populate("farmer");
      res.render("listings/buyer.ejs",{requests,buyername});
    }
    catch(err){
        req.flash("error occured");
    }
});
//signup buyer get
app.get("/users/signupbuyer", (req, res) => {
    res.render("users/signupbuyer.ejs");
});

app.post("/users/loginbuyer", redirectPath, passport.authenticate("buyer-local", { failureRedirect: "/users/signupbuyer", failureFlash: true }), async (req, res) => {
    req.flash("success", "Welcome to Buyer's DashBoard");
    let redirectpath1 = res.locals.redirect || "/listings/buyer";
    res.redirect(redirectpath1);
});

app.post("/users/signupbuyer",validateUser, async (req, res) => {
    try {
        let { name, username, email, location, password } = req.body;
        let buyer = new BuyerLogin({
            name,
            username: username,
            email: email,
            location: location
        });
        let response = await geocodingClient.forwardGeocode({
            query: location,
            limit: 1
        })
            .send()
        buyer.geometry = response.body.features[0].geometry;
        let test = await BuyerLogin.register(buyer, password);
        let buyerdata = await BuyerLogin.find({});
        req.login(test, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to Buyers Dashboard");
            res.redirect("/listings/buyer");
        })

    }
    catch (err) {
        req.flash("error", err.message);
        res.redirect("/users/signupbuyer");
    }
});

//order
app.get("/listings/Orders",isLoggedIn,isFarmer, async (req, res) => {
    let location = req.user.location;
    let buyerdata = await BuyerLogin.find({});

    let response = await geocodingClient.forwardGeocode({
        query: location,
        limit: 1
    })
    .send();
    let coordinate = response.body.features[0].geometry;
    res.render("listings/order.ejs", { buyerdata, coordinate });
});

//request
app.post("/request/send",isLoggedIn,isFarmer, async (req, res) => {
    try {
        let farmerId = req.user._id;
        let buyerId = req.body.buyerId;
        if (!req.user || !req.user._id) {
            console.log("🚫 No user found in req");
            req.flash("error", "🚫 No user found in req");
            res.redirect("/listings/Orders");            
        }
        //if already request is in pending
        let existingRequest = await Request.findOne({
            farmer: farmerId,
            buyer: buyerId,
            order: "pending", // order status is NOT rejected
        });

        if (existingRequest) {
            req.flash("error", "You already have a pending request with this buyer. Wait until it is rejected before sending a new one.");
            res.redirect("/listings/Orders");
        }
        let inventorysent = await AvailableInventory.findOne({ farmer: farmerId });
        const inventorySent = inventorysent.inventory.map(crop => ({
            crop: crop.crop,
            quantity: crop.quantity,
            price: crop.price,
            marketPrice: crop.marketPrice,
            priceReason: crop.priceReason
        }));
        console.log(inventorySent);
        if (!inventorysent || inventorysent.inventory.length === 0) {
            req.flash("error", "No inventory found.");
            res.redirect("/listings/Orders");   
        }
        console.log(inventorySent);
        let request = new Request({
            farmer: farmerId,
            buyer: buyerId,
            inventorySent: inventorySent,
            order: "pending"
        });
        await request.save();
        console.log("✅ Request saved");
       req.flash("success", "✅ Request sent successfully!");
       res.redirect("/listings/Orders");
        // res.status(200).json({ message: "Request sent successfully." });
        
    }
    catch (err) {
        req.flash("error", "Server error occurred.");
        res.redirect("/listings/Orders");
    }
});

// delete all requests 
app.get("/requests/deleteall", isLoggedIn,isFarmer, async (req, res) => {
  try {
   
    const farmerId = req.user._id;
    if (!farmerId) {
      req.flash("error","Please Login");
      res.redirect("/listings/Orders");
    }

    // Delete all requests by this farmer where order is NOT rejected
    const result = await Request.deleteMany({
      farmer: farmerId,
      order: "pending",
    });

    req.flash("success","Successfully deleted");
    res.redirect("/listings/Orders");

  } catch (error) {
    console.error(error);
    req.flash("error",error.message);
    res.redirect("/listings/Orders");
  }
});
app.get("/request/view/:id",isLoggedIn,isBuyer,async (req,res)=>{
    let requestId=req.params.id;
    let request=await Request.findById(requestId).populate("farmer");
    res.render("listings/requestview",{request});
});

//accept button
app.post("/accept-inventory/:id",isLoggedIn,isBuyer,async (req,res)=>{
    try{
        const Order = require('./models/order');
        let requestId=req.params.id;
        let request=await Request.findById(requestId).populate("farmer");
        let crop=req.body.crop;
        let quantity=req.body.quantity;
        let price=req.body.price;
        let farmerId=request.farmer._id;
        let c=0;
        for(let q of quantity){
            if(q=='0'){
                c++;
            }
        }
        if(c==quantity.length){
            req.flash("error","Atleast buy one product to accept");
            return res.redirect("/listings/buyer");
        }
        let inventoryaccepted = [];
        let totalprice=0;

        for (let i = 0; i < crop.length; i++) {
            if (quantity[i] > 0) {
                inventoryaccepted.push({
                    crop: crop[i],
                    quantity: Number(quantity[i]),
                    price: Number(price[i])
                });
                totalprice+=Number(quantity[i]*price[i]);
            }
        }
        request.inventoryaccepted=inventoryaccepted;
        request.order="accepted";
        await request.save();
        const requestdelete=await Request.deleteMany({
            farmer:farmerId,
            order:"pending"
        });
        
        // Create Order for payment processing
        const items = inventoryaccepted.map(item => ({
            crop: item.crop,
            quantity: item.quantity,
            unitPrice: item.price,
            total: item.quantity * item.price
        }));
        
        const taxRate = 0.05;
        const subtotal = totalprice;
        const taxAmount = +(subtotal * taxRate).toFixed(2);
        const grandTotal = +(subtotal + taxAmount).toFixed(2);
        
        const buyer = req.user;
        const shipping = {
            name: buyer.name || buyer.username,
            phone: buyer.phone || '',
            address: buyer.address || '',
            pincode: buyer.pincode || ''
        };
        
        const order = await Order.create({
            buyer: buyer._id,
            farmer: farmerId,
            items: items,
            subtotal: subtotal,
            taxRate: taxRate,
            taxAmount: taxAmount,
            grandTotal: grandTotal,
            payment: {
                method: 'COD',
                status: 'pending'
            },
            shipping: shipping,
            status: 'created'
        });
        
        // Don't update inventory yet - wait for payment
        // Inventory will be updated after payment is completed
        
        req.flash("success","Order created! Please proceed to payment.");
        res.redirect(`/buyer/payment/${order._id}`);
    }
    catch(err){
        console.error("Error accepting inventory:", err);
        req.flash("error",err.message);
        res.redirect("/listings/buyer");
    }
});
//buyer orders
app.get("/dashboard/buyer", isLoggedIn,isBuyer,async (req, res) => {
    try {
        const buyerId = req.user._id;
        const buyername=req.user.username;
        const orders = await Request.find({ 
            buyer: buyerId, 
            order: "accepted" 
        })
        .populate("farmer")
        .sort({ createdAt: -1 });

        res.render("listings/buyerorder", { orders ,buyername});
    } catch (err) {
        req.flash("error", err.message);
        res.redirect("/");
    }
});
//farmer orders
app.get("/dashboard/farmer",isLoggedIn,isFarmer, async (req, res) => {
    try {
        const farmerId = req.user._id;
        const farmername=req.user.username;
        const orders = await Request.find({ 
            farmer: farmerId, 
            order: "accepted" 
        })
        .populate("buyer")
        .sort({ createdAt: -1 });

        res.render("listings/farmerorders", { orders,farmername });
    } catch (err) {
        req.flash("error", err.message);
        res.redirect("/");
    }
});
//logoutfarmer
app.get("/logoutfarmer",(req,res,next)=>{
    // console.log(req.user);
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        req.flash("success","Logged out successfully");
        res.redirect("/");
    });
    
});
//logoutbuyer
app.get("/logoutbuyer",(req,res,next)=>{
    // console.log(req.user);
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        req.flash("success","Logged out successfully");
        res.redirect("/");
    });
});
app.get("/request/map/:id",isLoggedIn,async (req,res)=>{
    let requestId=req.params.id;
    let request=await Request.findById(requestId).populate("farmer").populate("buyer");
    let farmerlocation=request.farmer.location;
    let buyerlocation=request.buyer.location;
    let farmers = await geocodingClient.forwardGeocode({
        query: farmerlocation,
        limit: 1
    })
    .send();
    let farmercoordinate = farmers.body.features[0].geometry;
    let buyers = await geocodingClient.forwardGeocode({
        query: buyerlocation,
        limit: 1
    })
    .send();
    let buyercoordinate = buyers.body.features[0].geometry;
    console.log(buyercoordinate.coordinates,farmercoordinate.coordinates)

    res.render("listings/viewRequestmap.ejs",{farmercoordinate,buyercoordinate});
});

// API Routes
try {
    const apiRoutes = require("./routes/api");
    app.use("/api", apiRoutes);
    console.log("✅ ML API routes loaded successfully");
} catch (error) {
    console.log("⚠️  ML API routes not available:", error.message);
    console.log("Application will run without ML features");
}

// Export app for testing
module.exports = app;

