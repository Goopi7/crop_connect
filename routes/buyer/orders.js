const express = require('express');
const router = express.Router();
const { isBuyer } = require('../../middleware');
const BuyerLogin = require('../../models/loginbuyer');
const FarmerLogin = require('../../models/loginFarmer');
const { AvailableInventory, SoldInventory } = require('../../models/totalInventorySchema');
const Order = require('../../models/order');
const { generateOrderReceipt } = require('../../services/receiptService');
const paymentService = require('../../services/paymentService');

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

    const paymentMethod = req.body.paymentMethod || 'COD';
    
    let paymentData = { method: paymentMethod };
    
    // If online payment, use farmer's Razorpay account
    if (paymentMethod === 'online') {
      const farmerRazorpayUsername = farmer.razorpayMeUsername;
      if (!farmerRazorpayUsername) {
        return res.status(400).json({ 
          error: 'Farmer has not configured their Razorpay.me account. Please use COD or contact the farmer.',
          farmerName: farmer.name || farmer.username
        });
      }
      
      // Store farmer's account info for payment link generation
      paymentData.farmerAccount = farmerRazorpayUsername;
      paymentData.farmerName = farmer.name || farmer.username;
    }

    const order = await Order.create({
      buyer: buyer._id,
      farmer: farmer._id,
      items: normalized,
      subtotal: totals.subtotal,
      taxRate: totals.taxRate,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      payment: paymentData,
      shipping
    });

    return res.status(201).json({ 
      success: true, 
      orderId: order._id, 
      totals,
      payment: paymentData,
      redirectUrl: `/buyer/payment/${order._id}`
    });
  } catch (e) {
    console.error('Checkout error:', e);
    return res.status(500).json({ error: 'Checkout failed' });
  }
});

// GET /buyer/api/orders/:id/payment - Show payment page
router.get('/orders/:id/payment', isBuyer, async (req, res) => {
  try {
    const buyer = req.user;
    const order = await Order.findById(req.params.id).populate('farmer');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (String(order.buyer) !== String(buyer._id)) return res.status(403).json({ error: 'Not your order' });
    if (order.status !== 'created') {
      return res.redirect(`/dashboard/buyer?order=${order.status}`);
    }
    
    // Render payment page
    return res.render('buyer/payment', { order });
  } catch (e) {
    console.error('Payment page error:', e);
    return res.status(500).json({ error: 'Failed to load payment page' });
  }
});

// POST /buyer/api/orders/:id/pay - Process payment
router.post('/orders/:id/pay', isBuyer, async (req, res) => {
  try {
    const buyer = req.user;
    const order = await Order.findById(req.params.id).populate('farmer');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (String(order.buyer) !== String(buyer._id)) return res.status(403).json({ error: 'Not your order' });
    if (order.status !== 'created') return res.status(400).json({ error: `Order already ${order.status}` });

    const paymentMethod = req.body.paymentMethod || order.payment?.method || 'COD';
    let paymentResult;

    // Process payment based on method
    if (paymentMethod === 'upi') {
      // For UPI, simulate payment success (in production, verify with payment gateway)
      paymentResult = await paymentService.processUPIPayment(
        order._id,
        order.grandTotal,
        { upiRefId: req.body.upiRefId }
      );
    } else if (paymentMethod === 'online') {
      // If Razorpay data is provided, use it
      if (req.body.razorpay_order_id && req.body.razorpay_payment_id) {
        paymentResult = await paymentService.processOnlinePayment(
          order._id,
          order.grandTotal,
          'razorpay',
          { 
            razorpay_order_id: req.body.razorpay_order_id, 
            razorpay_payment_id: req.body.razorpay_payment_id, 
            razorpay_signature: req.body.razorpay_signature 
          }
        );
      } else {
        // Fallback to UPI if no Razorpay data
        paymentResult = await paymentService.processUPIPayment(order._id, order.grandTotal);
      }
    } else {
      // COD payment
      paymentResult = await paymentService.processCODPayment(order._id, order.grandTotal);
    }

    if (!paymentResult.success) {
      return res.status(400).json({ error: paymentResult.error || 'Payment failed' });
    }

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

    // Update order with payment details
    order.status = paymentMethod === 'COD' ? 'paid' : 'paid';
    order.payment = {
      method: paymentMethod,
      txnId: paymentResult.transactionId,
      status: paymentResult.status,
      meta: paymentResult
    };
    await order.save();

    return res.json({ 
      success: true, 
      status: order.status,
      transactionId: paymentResult.transactionId,
      message: paymentResult.message
    });
  } catch (e) {
    console.error('Payment error:', e);
    return res.status(500).json({ error: 'Payment failed: ' + e.message });
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

// GET /buyer/api/orders/:id/payment-status
router.get('/orders/:id/payment-status', isBuyer, async (req, res) => {
  try {
    const buyer = req.user;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (String(order.buyer) !== String(buyer._id)) return res.status(403).json({ error: 'Not your order' });
    
    return res.json({
      orderId: order._id,
      status: order.status,
      payment: order.payment,
      grandTotal: order.grandTotal
    });
  } catch (e) {
    console.error('Payment status error:', e);
    return res.status(500).json({ error: 'Failed to get payment status' });
  }
});

// POST /buyer/api/orders/:id/payment-link - Generate Razorpay payment link (goes directly to farmer)
router.post('/orders/:id/payment-link', isBuyer, async (req, res) => {
  try {
    const buyer = req.user;
    const order = await Order.findById(req.params.id).populate('farmer');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (String(order.buyer) !== String(buyer._id)) return res.status(403).json({ error: 'Not your order' });
    if (order.status === 'paid') return res.status(400).json({ error: 'Order already paid' });

    // Get farmer's Razorpay.me username
    const farmerRazorpayUsername = order.farmer?.razorpayMeUsername;
    if (!farmerRazorpayUsername) {
      return res.status(400).json({ 
        error: 'Farmer has not configured their Razorpay.me account. Please contact the farmer to set up their payment account.',
        farmerName: order.farmer?.name || order.farmer?.username
      });
    }

    const customerInfo = {
      name: buyer.name || buyer.username,
      email: buyer.email || '',
      phone: buyer.phone || ''
    };

    const description = `Payment for Order #${order._id} - ${order.items.map(i => i.crop).join(', ')} - Farmer: ${order.farmer.name || order.farmer.username}`;

    // Generate payment link that goes directly to farmer's account
    const paymentLink = await paymentService.createPaymentLink(
      order.grandTotal,
      'INR',
      order._id,
      customerInfo,
      description,
      farmerRazorpayUsername, // Use farmer's Razorpay account
      true // Use simple link format
    );

    // Store payment link in order
    if (!order.payment) order.payment = {};
    order.payment.paymentLinkId = paymentLink.paymentLinkId;
    order.payment.paymentLink = paymentLink.paymentLink;
    order.payment.farmerAccount = farmerRazorpayUsername;
    await order.save();

    return res.json({
      success: true,
      paymentLink: paymentLink.paymentLink || paymentLink.shortUrl,
      paymentLinkId: paymentLink.paymentLinkId,
      amount: order.grandTotal,
      farmerAccount: farmerRazorpayUsername,
      farmerName: order.farmer.name || order.farmer.username,
      message: `Payment link generated. Payment will go directly to ${order.farmer.name || order.farmer.username}'s Razorpay account.`
    });
  } catch (e) {
    console.error('Payment link generation error:', e);
    return res.status(500).json({ error: 'Failed to generate payment link: ' + e.message });
  }
});

// GET /buyer/api/orders/:id/payment-callback - Callback after payment
router.get('/orders/:id/payment-callback', isBuyer, async (req, res) => {
  try {
    const buyer = req.user;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (String(order.buyer) !== String(buyer._id)) return res.status(403).json({ error: 'Not your order' });

    // Check payment link status
    if (order.payment?.paymentLinkId) {
      const linkStatus = await paymentService.getPaymentLinkStatus(order.payment.paymentLinkId);
      if (linkStatus.status === 'paid' && order.status === 'created') {
        // Payment successful, process the order
        const paymentResult = await paymentService.processOnlinePayment(
          order._id,
          order.grandTotal,
          'razorpay',
          { paymentLinkId: order.payment.paymentLinkId }
        );

        if (paymentResult.success) {
          // Update order status (similar to /pay endpoint logic)
          order.status = 'paid';
          order.payment.status = 'success';
          order.payment.transactionId = paymentResult.transactionId;
          await order.save();

          // Redirect to success page
          return res.redirect(`/dashboard/buyer?payment=success&orderId=${order._id}`);
        }
      }
    }

    // Redirect to orders page
    return res.redirect('/dashboard/buyer');
  } catch (e) {
    console.error('Payment callback error:', e);
    return res.redirect('/dashboard/buyer?payment=error');
  }
});

module.exports = router;
