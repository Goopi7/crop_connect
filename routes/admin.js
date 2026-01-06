const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const AdminLogin = require('../models/loginAdmin');
const FarmerLogin = require('../models/loginFarmer');
const BuyerLogin = require('../models/loginbuyer');
const { SoldInventory } = require('../models/totalInventorySchema');
const Request = require('../models/requestSchema');
const Crop = require('../models/cropModel');
const { isAdmin, hasAdminPermission } = require('../middleware');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Admin router request logger (diagnostics)
router.use((req, res, next) => {
    try {
        console.log(`[ADMIN] ${req.method} ${req.originalUrl}`);
    } catch (_) {}
    next();
});

// Health check to confirm router mount
router.get('/api/health', (req, res) => {
    res.json({ ok: true, ts: Date.now() });
});

// Get all farmers
router.get('/api/farmers', isAdmin, async (req, res) => {
    try {
        const farmers = await FarmerLogin.find({});
        res.json(farmers);
    } catch (err) {
        console.error('Error fetching farmers:', err);
        res.status(500).json({ error: 'Failed to fetch farmers' });
    }
});

// Get single farmer
router.get('/api/farmers/:id', isAdmin, async (req, res) => {
    try {
        const farmer = await FarmerLogin.findById(req.params.id);
        if (!farmer) {
            return res.status(404).json({ error: 'Farmer not found' });
        }
        res.json(farmer);
    } catch (err) {
        console.error('Error fetching farmer:', err);
        res.status(500).json({ error: 'Failed to fetch farmer' });
    }
});

// Update farmer
router.put('/api/farmers/:id', isAdmin, hasAdminPermission('manage_users'), async (req, res) => {
    try {
        const { name, username, email, location } = req.body;
        const update = {};
        if (name) update.name = name;
        if (username) update.username = username;
        if (email) update.email = email;
        if (location) update.location = location;
        const farmer = await FarmerLogin.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
        if (!farmer) {
            return res.status(404).json({ success: false, message: 'Farmer not found' });
        }
        res.json({ success: true, farmer });
    } catch (err) {
        console.error('Error updating farmer:', err);
        res.status(500).json({ success: false, message: 'Failed to update farmer', details: err.message });
    }
});

// Get all buyers
router.get('/api/buyers', isAdmin, async (req, res) => {
    try {
        const buyers = await BuyerLogin.find({});
        res.json(buyers);
    } catch (err) {
        console.error('Error fetching buyers:', err);
        res.status(500).json({ error: 'Failed to fetch buyers' });
    }
});

// Get single buyer
router.get('/api/buyers/:id', isAdmin, async (req, res) => {
    try {
        const buyer = await BuyerLogin.findById(req.params.id);
        if (!buyer) {
            return res.status(404).json({ error: 'Buyer not found' });
        }
        res.json(buyer);
    } catch (err) {
        console.error('Error fetching buyer:', err);
        res.status(500).json({ error: 'Failed to fetch buyer' });
    }
});

// Update buyer
router.put('/api/buyers/:id', isAdmin, hasAdminPermission('manage_users'), async (req, res) => {
    try {
        const { name, username, email, location } = req.body;
        const update = {};
        if (name) update.name = name;
        if (username) update.username = username;
        if (email) update.email = email;
        if (location) update.location = location;
        const buyer = await BuyerLogin.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
        if (!buyer) {
            return res.status(404).json({ success: false, message: 'Buyer not found' });
        }
        res.json({ success: true, buyer });
    } catch (err) {
        console.error('Error updating buyer:', err);
        res.status(500).json({ success: false, message: 'Failed to update buyer', details: err.message });
    }
});

// Get all transactions
router.get('/api/transactions', isAdmin, async (req, res) => {
    try {
        const transactions = await SoldInventory.find({})
            .populate('farmer', 'name username');

        const formattedTransactions = transactions.flatMap(trx => {
            const seller = trx.farmer ? { name: trx.farmer.name, _id: trx.farmer._id } : { name: 'Unknown', _id: null };
            return (trx.inventory || []).map(item => ({
                _id: trx._id,
                buyer: { name: 'N/A' },
                seller,
                crop: item.crop,
                quantity: item.quantity,
                amount: (item.price || 0) * (item.quantity || 0),
                date: new Date()
            }));
        });

        res.json(formattedTransactions);
    } catch (err) {
        console.error('Error fetching transactions:', err);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Delete a farmer
router.delete('/api/farmers/:id', isAdmin, hasAdminPermission('manage_users'), async (req, res) => {
    try {
        const { id } = req.params;
        await FarmerLogin.findByIdAndDelete(id);
        res.json({ success: true, message: 'Farmer deleted successfully' });
    } catch (err) {
        console.error('Error deleting farmer:', err);
        res.status(500).json({ success: false, message: 'Failed to delete farmer' });
    }
});

// Delete a buyer
router.delete('/api/buyers/:id', isAdmin, hasAdminPermission('manage_users'), async (req, res) => {
    try {
        const { id } = req.params;
        await BuyerLogin.findByIdAndDelete(id);
        res.json({ success: true, message: 'Buyer deleted successfully' });
    } catch (err) {
        console.error('Error deleting buyer:', err);
        res.status(500).json({ success: false, message: 'Failed to delete buyer' });
    }
});

// Admin Dashboard Routes
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        const [totalFarmers, totalBuyers, totalRequests, pendingRequests] = await Promise.all([
            FarmerLogin.countDocuments({}),
            BuyerLogin.countDocuments({}),
            Request.countDocuments({}),
            Request.countDocuments({ status: 'pending' })
        ]);

        res.render('admin/dashboard', {
            layout: 'layout/boilerplate',
            adminName: req.user?.name || req.user?.username || 'admin',
            adminRole: req.user?.role || 'admin',
            stats: { totalFarmers, totalBuyers, totalRequests, pendingRequests }
        });
    } catch (e) {
        console.error('Dashboard render error:', e);
        res.render('admin/dashboard', { layout: 'layout/boilerplate' });
    }
});

router.get('/users', isAdmin, (req, res) => {
    res.render('admin/users', {
        layout: 'layout/boilerplate',
        adminName: req.user?.name || req.user?.username || 'admin',
        adminRole: req.user?.role || 'admin'
    });
});

router.get('/crops', isAdmin, (req, res) => {
    res.render('admin/crops', {
        layout: 'layout/boilerplate',
        adminName: req.user?.name || req.user?.username || 'admin',
        adminRole: req.user?.role || 'admin'
    });
});

router.get('/requests', isAdmin, (req, res) => {
    res.render('admin/requests', {
        layout: 'layout/boilerplate',
        adminName: req.user?.name || req.user?.username || 'admin',
        adminRole: req.user?.role || 'admin'
    });
});

// Additional admin pages
router.get('/analytics', isAdmin, (req, res) => {
    res.render('admin/analytics', {
        layout: 'layout/boilerplate',
        adminName: req.user?.name || req.user?.username || 'admin',
        adminRole: req.user?.role || 'admin'
    });
});

router.get('/settings', isAdmin, (req, res) => {
    res.render('admin/settings', {
        layout: 'layout/boilerplate',
        adminName: req.user?.name || req.user?.username || 'admin',
        adminRole: req.user?.role || 'admin'
    });
});

// Admin analytics API (used by analytics.ejs)
router.get('/api/analytics', isAdmin, async (req, res) => {
    try {
        const timeRange = req.query.timeRange === 'all' ? 'all' : parseInt(req.query.timeRange || '30');
        const now = new Date();
        const since = timeRange === 'all' ? null : new Date(now.getTime() - (Number.isFinite(timeRange) ? timeRange : 30) * 24 * 60 * 60 * 1000);

        const dateMatchStage = (since) => since ? [{
            $match: { _id: { $gte: (function() { const ts = Math.floor(since.getTime()/1000); const hex = ts.toString(16).padStart(8,'0'); return new mongoose.Types.ObjectId(hex + '0000000000000000'); })() } }
        }] : [];

        const useDaily = since && ((now - since) <= 90*24*60*60*1000);
        const groupDateExpr = useDaily
            ? { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$_id" } } }
            : { $dateToString: { format: "%Y-%m", date: { $toDate: "$_id" } } };

        const [totalUsers, totalFarmers, totalBuyers, totalTransactions] = await Promise.all([
            AdminLogin.countDocuments({})
                .then(a => FarmerLogin.countDocuments({}).then(f => a + f))
                .then(sum => BuyerLogin.countDocuments({}).then(b => sum + b)),
            FarmerLogin.countDocuments({}),
            BuyerLogin.countDocuments({}),
            SoldInventory.countDocuments({})
        ]);

        const userDistribution = {
            role: {
                labels: ['Farmers', 'Buyers', 'Admins'],
                data: [await FarmerLogin.countDocuments({}), await BuyerLogin.countDocuments({}), await AdminLogin.countDocuments({})]
            },
            location: {
                labels: [],
                data: []
            }
        };

        try {
            const byLoc = await FarmerLogin.aggregate([
                { $group: { _id: { $ifNull: ['$location', 'Unknown'] }, count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]);
            userDistribution.location.labels = byLoc.map(x => x._id);
            userDistribution.location.data = byLoc.map(x => x.count);
        } catch (_) {}

        let topCrops = { labels: [], data: [] };
        try {
            const agg = await SoldInventory.aggregate([
                { $unwind: { path: '$inventory', preserveNullAndEmptyArrays: false } },
                { $group: { _id: '$inventory.crop', qty: { $sum: '$inventory.quantity' } } },
                { $sort: { qty: -1 } },
                { $limit: 8 }
            ]);
            topCrops.labels = agg.map(x => x._id || 'Unknown');
            topCrops.data = agg.map(x => x.qty || 0);
        } catch (_) {}

        async function seriesForModel(Model) {
            const pipeline = [
                ...dateMatchStage(since),
                { $group: { _id: groupDateExpr, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ];
            const rows = await Model.aggregate(pipeline);
            return { labels: rows.map(r => r._id), data: rows.map(r => r.count) };
        }

        const [regsFarmers, regsBuyers, trxSeries] = await Promise.all([
            seriesForModel(FarmerLogin),
            seriesForModel(BuyerLogin),
            seriesForModel(SoldInventory)
        ]);

        const mapCounts = (s) => Object.fromEntries(s.labels.map((l, i) => [l, s.data[i]]));
        const mf = mapCounts(regsFarmers), mb = mapCounts(regsBuyers);
        const labelsCombined = Array.from(new Set([...regsFarmers.labels, ...regsBuyers.labels])).sort();
        const registrations = { labels: labelsCombined, data: labelsCombined.map(l => (mf[l]||0) + (mb[l]||0)) };
        const logins = { labels: registrations.labels, data: registrations.data.map(v => Math.round(v * 3)) };
        const transactions = trxSeries;
        const userActivity = { registrations, logins, transactions };

        const recommendationSuccess = { labels: ['Successful','Neutral','Unsuccessful'], data: [70, 20, 10] };
        const labelsMonthly = registrations.labels.length ? registrations.labels : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const chatbotPerformance = {
            labels: labelsMonthly,
            responseTime: Array.from({ length: 12 }, (_, i) => 300 - i * 8),
            satisfactionScore: Array.from({ length: 12 }, (_, i) => 3.5 + i * 0.08)
        };

        const topChatbotTopics = [];

        const regionalData = userDistribution.location.labels.map((name, idx) => ({
            name,
            userCount: userDistribution.location.data[idx] || 0,
            cropCount: topCrops.data[idx] || 0
        }));

        return res.json({
            overview: {
                totalUsers,
                totalTransactions,
                totalRecommendations: await Crop.countDocuments({}),
                totalChatbotQueries: 0
            },
            userActivity,
            userDistribution,
            topCrops,
            recommendationSuccess,
            chatbotPerformance,
            topChatbotTopics,
            regionalData
        });
    } catch (e) {
        console.error('Admin analytics (protected) error:', e);
        return res.status(500).json({ error: 'Failed to load analytics' });
    }
});

// ---------- User management APIs (for admin/users page) ----------
function toUserDTO(doc, roleFallback) {
    if (!doc) return null;
    return {
        _id: doc._id,
        name: doc.name || doc.username || '',
        username: doc.username,
        email: doc.email || '',
        role: doc.role || roleFallback,
        status: (doc.isActive === false) ? 'inactive' : 'active',
        location: doc.location,
        crops: doc.crops,
        business: doc.business,
        businessType: doc.businessType,
        lastLogin: doc.lastLogin,
        createdAt: doc.createdAt || doc._id.getTimestamp?.() || new Date()
    };
}

async function findUserById(id) {
    return (
        await FarmerLogin.findById(id) ||
        await BuyerLogin.findById(id) ||
        await AdminLogin.findById(id)
    );
}

function applyUpdates(doc, payload) {
    const fields = ['name', 'username', 'email', 'location', 'crops', 'business', 'businessType'];
    fields.forEach(f => {
        if (payload[f] !== undefined) doc[f] = payload[f];
    });
    if (payload.status) {
        doc.isActive = payload.status !== 'inactive';
    }
    if (payload.adminRole && doc instanceof AdminLogin) {
        doc.role = payload.adminRole;
    }
}

// All users combined
router.get('/api/users', isAdmin, async (_req, res) => {
    try {
        const [farmers, buyers, admins] = await Promise.all([
            FarmerLogin.find({}).lean(),
            BuyerLogin.find({}).lean(),
            AdminLogin.find({}).lean()
        ]);
        const all = [
            ...farmers.map(f => toUserDTO(f, 'farmer')),
            ...buyers.map(b => toUserDTO(b, 'buyer')),
            ...admins.map(a => toUserDTO(a, 'admin'))
        ];
        res.json(all);
    } catch (e) {
        console.error('Error fetching all users:', e);
        res.status(500).json([]);
    }
});

// Admins only
router.get('/api/admins', isAdmin, async (_req, res) => {
    try {
        const admins = await AdminLogin.find({});
        res.json(admins.map(a => toUserDTO(a, 'admin')));
    } catch (e) {
        console.error('Error fetching admins:', e);
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
});

// Single user by id (any role)
router.get('/api/users/:id', isAdmin, async (req, res) => {
    try {
        const user = await findUserById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const role = user.constructor.modelName === 'FarmerLogin' ? 'farmer'
            : user.constructor.modelName === 'BuyerLogin' ? 'buyer'
            : 'admin';
        res.json(toUserDTO(user, role));
    } catch (e) {
        console.error('Error fetching user:', e);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Update user (generic)
router.put('/api/users/:id', isAdmin, hasAdminPermission('manage_users'), async (req, res) => {
    try {
        const user = await findUserById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        applyUpdates(user, req.body || {});
        await user.save();
        res.json({ success: true, user: toUserDTO(user, user.role) });
    } catch (e) {
        console.error('Error updating user:', e);
        res.status(500).json({ success: false, message: 'Failed to update user', details: e.message });
    }
});

// Delete user (generic)
router.delete('/api/users/:id', isAdmin, hasAdminPermission('manage_users'), async (req, res) => {
    try {
        const deleted = await FarmerLogin.findByIdAndDelete(req.params.id)
            || await BuyerLogin.findByIdAndDelete(req.params.id)
            || await AdminLogin.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true });
    } catch (e) {
        console.error('Error deleting user:', e);
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
});

// Export all users CSV
router.get('/api/users/export', isAdmin, async (_req, res) => {
    try {
        const [farmers, buyers, admins] = await Promise.all([
            FarmerLogin.find({}).lean(),
            BuyerLogin.find({}).lean(),
            AdminLogin.find({}).lean()
        ]);
        const rows = [
            ...farmers.map(u => ({ role: 'farmer', username: u.username, name: u.name || '', email: u.email || '', location: u.location || '' })),
            ...buyers.map(u => ({ role: 'buyer', username: u.username, name: u.name || '', email: u.email || '', location: u.location || '' })),
            ...admins.map(u => ({ role: 'admin', username: u.username, name: u.name || '', email: u.email || '', location: '' }))
        ];
        const headers = ['role','username','name','email','location'];
        const escape = (v) => {
            if (v === null || v === undefined) return '';
            const s = String(v).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
        };
        const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => escape(r[h])).join(','))).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
        res.send(csv);
    } catch (e) {
        console.error('Error exporting users:', e);
        res.status(500).json({ error: 'Failed to export users' });
    }
});

// Export admins CSV
router.get('/api/admins/export', isAdmin, async (_req, res) => {
    try {
        const admins = await AdminLogin.find({}).lean();
        const headers = ['username','name','email','role','isActive'];
        const escape = (v) => {
            if (v === null || v === undefined) return '';
            const s = String(v).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
        };
        const csv = [headers.join(',')].concat(admins.map(r => headers.map(h => escape(r[h])).join(','))).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=admins.csv');
        res.send(csv);
    } catch (e) {
        console.error('Error exporting admins:', e);
        res.status(500).json({ error: 'Failed to export admins' });
    }
});

// ----- Admin Requests APIs -----
// Normalize to /admin/api/requests*
router.get('/api/requests/counts', isAdmin, async (req, res) => {
    try {
        const total = await Request.countDocuments({});
        // We currently only store market-style requests in Request model
        res.json({ total, chatbot: 0, cropRecommendation: 0, market: total });
    } catch (e) {
        console.error('Counts error:', e);
        res.status(500).json({ total: 0, chatbot: 0, cropRecommendation: 0, market: 0 });
    }
});

// List all (maps to market requests until other types exist)
router.get('/api/requests', isAdmin, async (req, res) => {
    try {
        const items = await Request.find({}).populate('farmer', 'name').populate('buyer', 'name').lean();
        const out = items.map(r => ({
            _id: r._id.toString(),
            type: 'market',
            user: r.buyer ? { name: r.buyer.name } : null,
            content: Array.isArray(r.inventorySent) && r.inventorySent.length
                ? r.inventorySent.map(i => `${i.crop}:${i.quantity}@${i.price}`).join(', ')
                : 'Market request',
            createdAt: r.createdAt || new Date(),
            resolved: r.order === 'accepted'
        }));
        res.json(out);
    } catch (e) {
        console.error('List requests error:', e);
        res.status(500).json([]);
    }
});

// Market-only list
router.get('/api/requests/market', isAdmin, async (req, res) => {
    try {
        const items = await Request.find({}).populate('farmer', 'name').populate('buyer', 'name').lean();
        const out = items.map(r => ({
            _id: r._id.toString(),
            farmer: r.farmer ? { name: r.farmer.name } : null,
            buyer: r.buyer ? { name: r.buyer.name } : null,
            crop: (r.inventorySent && r.inventorySent[0]?.crop) || '-',
            quantity: (r.inventorySent && r.inventorySent[0]?.quantity) || 0,
            status: r.order,
            createdAt: r.createdAt || new Date()
        }));
        res.json(out);
    } catch (e) {
        console.error('Market requests error:', e);
        res.status(500).json([]);
    }
});

// Stubs for chatbot and crop-recommendations until models exist
router.get('/api/requests/chatbot', isAdmin, async (req, res) => {
    res.json([]);
});
router.get('/api/requests/crop-recommendations', isAdmin, async (req, res) => {
    res.json([]);
});

// Get single request (market)
router.get('/api/requests/:id', isAdmin, async (req, res) => {
    try {
        const r = await Request.findById(req.params.id).populate('farmer', 'name').populate('buyer', 'name').lean();
        if (!r) return res.status(404).json({ error: 'Not found' });
        res.json({
            _id: r._id.toString(),
            type: 'market',
            user: r.buyer ? { name: r.buyer.name } : null,
            content: Array.isArray(r.inventorySent) && r.inventorySent.length
                ? r.inventorySent.map(i => `${i.crop}:${i.quantity}@${i.price}`).join(', ')
                : 'Market request',
            createdAt: r.createdAt || new Date(),
            resolved: r.order === 'accepted',
            status: r.order,
            metadata: { farmer: r.farmer?.name || '-', items: r.inventorySent || [] }
        });
    } catch (e) {
        console.error('Get request error:', e);
        res.status(500).json({ error: 'Failed to load request' });
    }
});

// Resolve
router.put('/api/requests/:id/resolve', isAdmin, async (req, res) => {
    try {
        const r = await Request.findByIdAndUpdate(req.params.id, { order: 'accepted' }, { new: true });
        if (!r) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true });
    } catch (e) {
        console.error('Resolve request error:', e);
        res.status(500).json({ success: false, message: 'Failed to resolve' });
    }
});

// Delete
router.delete('/api/requests/:id', isAdmin, async (req, res) => {
    try {
        await Request.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) {
        console.error('Delete request error:', e);
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
});

// Dev-only: seed one market-style request (use only in development)
router.post('/dev/seed-request', isAdmin, async (req, res) => {
    try {
        const farmer = await FarmerLogin.findOne({});
        const buyer = await BuyerLogin.findOne({});
        if (!farmer || !buyer) {
            return res.status(400).json({ success: false, message: 'Need at least one farmer and one buyer to seed a request' });
        }
        const r = await Request.create({
            farmer: farmer._id,
            buyer: buyer._id,
            order: 'pending',
            inventorySent: [ { crop: 'Tomato', quantity: 50, price: 20 } ]
        });
        res.json({ success: true, id: r._id });
    } catch (e) {
        console.error('Seed request error:', e);
        res.status(500).json({ success: false, message: 'Failed to seed request' });
    }
});

// Crop API Endpoints
router.get('/api/crops', isAdmin, async (req, res) => {
    try {
        const crops = await Crop.find({});
        res.json(crops);
    } catch (err) {
        console.error('Error fetching crops:', err);
        res.status(500).json({ error: 'Failed to fetch crops' });
    }
});

router.get('/api/crops/:id', isAdmin, async (req, res) => {
    try {
        const crop = await Crop.findById(req.params.id);
        if (!crop) {
            return res.status(404).json({ error: 'Crop not found' });
        }
        res.json(crop);
    } catch (err) {
        console.error('Error fetching crop:', err);
        res.status(500).json({ error: 'Failed to fetch crop' });
    }
});

router.post('/api/crops', isAdmin, hasAdminPermission('manage_crops'), async (req, res) => {
    try {
        const newCrop = new Crop(req.body);
        await newCrop.save();
        res.status(201).json(newCrop);
    } catch (err) {
        console.error('Error creating crop:', err);
        res.status(500).json({ error: 'Failed to create crop', details: err.message });
    }
});

router.put('/api/crops/:id', isAdmin, hasAdminPermission('manage_crops'), async (req, res) => {
    try {
        const updatedCrop = await Crop.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedCrop) {
            return res.status(404).json({ error: 'Crop not found' });
        }
        res.json(updatedCrop);
    } catch (err) {
        console.error('Error updating crop:', err);
        res.status(500).json({ error: 'Failed to update crop', details: err.message });
    }
});

router.delete('/api/crops/:id', isAdmin, hasAdminPermission('manage_crops'), async (req, res) => {
    try {
        const deletedCrop = await Crop.findByIdAndDelete(req.params.id);
        if (!deletedCrop) {
            return res.status(404).json({ error: 'Crop not found' });
        }
        res.json({ success: true, message: 'Crop deleted successfully' });
    } catch (err) {
        console.error('Error deleting crop:', err);
        res.status(500).json({ error: 'Failed to delete crop' });
    }
});

// Generate receipt for a transaction
router.get('/api/transactions/:id/receipt', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await SoldInventory.findById(id)
            .populate('farmer', 'name username location');
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        // Create a PDF document
        const doc = new PDFDocument({ margin: 50 });
        
        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${id}.pdf`);
        
        // Pipe the PDF to the response
        doc.pipe(res);
        
        // Add content to the PDF
        generateReceiptPDF(doc, transaction);
        
        // Finalize the PDF and end the stream
        doc.end();
    } catch (err) {
        console.error('Error generating receipt:', err);
        res.status(500).json({ error: 'Failed to generate receipt' });
    }
});

// Helper function to generate receipt PDF
function generateReceiptPDF(doc, transaction) {
    // Add logo and header
    doc.fontSize(20).text('Crop Connect', { align: 'center' });
    doc.fontSize(14).text('Transaction Receipt', { align: 'center' });
    doc.moveDown();
    
    // Add transaction details
    doc.fontSize(12).text(`Receipt ID: ${transaction._id}`);
    doc.text(`Date: ${new Date(transaction.date || Date.now()).toLocaleDateString()}`);
    doc.moveDown();
    
    // Add buyer and seller information (buyer not stored in SoldInventory)
    doc.fontSize(14).text('Buyer Information:');
    doc.fontSize(10)
        .text(`Name: N/A`)
        .text(`Username: N/A`)
        .text(`Email: N/A`);
    doc.moveDown();
    
    doc.fontSize(14).text('Seller Information:');
    doc.fontSize(10)
        .text(`Name: ${transaction.farmer.name}`)
        .text(`Username: ${transaction.farmer.username}`)
        .text(`Location: ${transaction.farmer.location || 'N/A'}`);
    doc.moveDown();
    
    // Add items table
    doc.fontSize(14).text('Items Purchased:');
    doc.moveDown();
    
    // Table header
    const tableTop = doc.y;
    const itemX = 50;
    const quantityX = 250;
    const priceX = 350;
    const amountX = 450;
    
    doc.fontSize(10)
        .text('Item', itemX, tableTop)
        .text('Quantity', quantityX, tableTop)
        .text('Price', priceX, tableTop)
        .text('Amount', amountX, tableTop);
    
    doc.moveDown();
    let tableY = doc.y;
    
    // Table rows
    let totalAmount = 0;
    transaction.inventory.forEach(item => {
        const amount = (item.price || 0) * (item.quantity || 0);
        totalAmount += amount;
        
        doc.text(item.crop, itemX, tableY)
            .text(`${item.quantity} kg`, quantityX, tableY)
            .text(`₹${item.price}`, priceX, tableY)
            .text(`₹${amount}`, amountX, tableY);
        
        tableY += 20;
    });
    
    // Draw table lines
    doc.moveTo(itemX, tableTop - 5)
        .lineTo(amountX + 50, tableTop - 5)
        .stroke();
    
    doc.moveTo(itemX, tableTop + 15)
        .lineTo(amountX + 50, tableTop + 15)
        .stroke();
    
    doc.moveTo(itemX, tableY + 5)
        .lineTo(amountX + 50, tableY + 5)
        .stroke();
    
    // Add total
    doc.fontSize(12).text(`Total Amount: ₹${totalAmount}`, { align: 'right' });
    doc.moveDown();
    
    // Add footer
    doc.fontSize(10).text('Thank you for using Crop Connect!', { align: 'center' });
    doc.text('This is a computer-generated receipt and does not require a signature.', { align: 'center' });
}

module.exports = router;