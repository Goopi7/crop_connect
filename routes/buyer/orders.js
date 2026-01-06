const express = require('express');
const router = express.Router();
const { isBuyer } = require('../../middleware');
const BuyerLogin = require('../../models/loginbuyer');
const FarmerLogin = require('../../models/loginFarmer');
const { AvailableInventory, SoldInventory } = require('../../models/totalInventorySchema');
const Order = require('../../models/order');
const { generateOrderReceipt } = require('../../services/receiptService');

// Helper to compute totals with 5% tax
function computeTotals(items, taxRate = 0.05) {
  const subtotal = items.reduce((s, it) => s + (it.total || (it.quantity * it.unitPrice)), 0);
  const taxAmount = +(subtotal * taxRate).toFixed(2);
  const grandTotal = +(subtotal + taxAmount).toFixed(2);
  return { subtotal, taxRate, taxAmount, grandTotal };
}

// POST /buyer/api/orders/checkout
// Body: { farmerId, items: [{ crop, quantity, unitPrice }] }
router.post('/orders/checkout', isBuyer, async (req, res) => {
  try {
    const buyer = req.user;
    const { farmerId, items = [] } = req.body || {};
    if (!farmerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'farmerId and items[] are required' });
    }

    const farmer = await FarmerLogin.findById(farmerId);
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

    // Validate inventory availability
    const avail = await AvailableInventory.findOne({ farmer: farmer._id });
    if (!avail) return res.status(400).json({ error: 'Farmer has no available inventory' });

    const normalized = items.map(it => ({
      crop: it.crop,
      quantity: Number(it.quantity || 0),
      unitPrice: Number(it.unitPrice || 0),
      total: Number((Number(it.quantity || 0) * Number(it.unitPrice || 0)).toFixed(2))
    }));

    // Simple stock check per crop (if found in available inventory)
    for (const it of normalized) {
      const stock = (avail.inventory || []).find(x => (x.crop || '').toLowerCase() === String(it.crop).toLowerCase());
      if (!stock || stock.quantity < it.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${it.crop}` });
      }
    }

    const totals = computeTotals(normalized, 0.05);

    // Use buyer profile address for shipping
    const shipping = {
      name: buyer.name || buyer.username,
      phone: buyer.phone || '',
      address: buyer.address || '',
      pincode: buyer.pincode || ''
    };

    const order = await Order.create({
      buyer: buyer._id,
      farmer: farmer._id,
      items: normalized,
      subtotal: totals.subtotal,
      taxRate: totals.taxRate,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      payment: { method: 'COD' },
      shipping
    });

    return res.status(201).json({ success: true, orderId: order._id, totals });
  } catch (e) {
    console.error('Checkout error:', e);
    return res.status(500).json({ error: 'Checkout failed' });
  }
});

// POST /buyer/api/orders/:id/pay (mock payment: marks paid, decrements stock, writes SoldInventory)
router.post('/orders/:id/pay', isBuyer, async (req, res) => {
  try {
    const buyer = req.user;
    const order = await Order.findById(req.params.id).populate('farmer');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (String(order.buyer) !== String(buyer._id)) return res.status(403).json({ error: 'Not your order' });
    if (order.status !== 'created') return res.status(400).json({ error: `Order already ${order.status}` });

    // Decrement available inventory
    const avail = await AvailableInventory.findOne({ farmer: order.farmer._id });
    if (!avail) return res.status(400).json({ error: 'Farmer has no available inventory' });

    for (const it of order.items) {
      const stock = (avail.inventory || []).find(x => (x.crop || '').toLowerCase() === String(it.crop).toLowerCase());
      if (!stock || stock.quantity < it.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${it.crop}` });
      }
      stock.quantity -= it.quantity;
    }
    await avail.save();

    // Append to SoldInventory
    let sold = await SoldInventory.findOne({ farmer: order.farmer._id });
    if (!sold) sold = new SoldInventory({ farmer: order.farmer._id, inventory: [] });
    for (const it of order.items) {
      sold.inventory.push({ crop: it.crop, quantity: it.quantity, price: it.unitPrice });
    }
    await sold.save();

    // Mark order as paid (mock payment)
    order.status = 'paid';
    order.payment = { method: 'COD', txnId: 'MOCK-TXN-' + Date.now() };
    await order.save();

    return res.json({ success: true, status: order.status });
  } catch (e) {
    console.error('Payment error:', e);
    return res.status(500).json({ error: 'Payment failed' });
  }
});

// GET /buyer/api/orders/:id/receipt → PDF
router.get('/orders/:id/receipt', isBuyer, async (req, res) => {
  try {
    const buyer = req.user;
    const order = await Order.findById(req.params.id).populate('farmer');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (String(order.buyer) !== String(buyer._id)) return res.status(403).json({ error: 'Not your order' });
    return generateOrderReceipt(res, order);
  } catch (e) {
    console.error('Receipt error:', e);
    return res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

module.exports = router;
