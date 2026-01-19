/**
 * Payment Service - Handles payment processing
 * Supports COD (Cash on Delivery) and Online payments (Razorpay integration ready)
 */

const crypto = require('crypto');

class PaymentService {
    constructor() {
        // Razorpay credentials (set in .env)
        this.razorpayKeyId = process.env.RAZORPAY_KEY_ID;
        this.razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
        this.razorpayEnabled = !!(this.razorpayKeyId && this.razorpayKeySecret);
        // Razorpay.me username (e.g., @mandhategopinathreddy)
        this.razorpayMeUsername = process.env.RAZORPAY_ME_USERNAME || 'mandhategopinathreddy';
    }

    /**
     * Generate payment order for Razorpay
     */
    async createRazorpayOrder(amount, currency = 'INR', orderId, customerInfo = {}) {
        if (!this.razorpayEnabled) {
            throw new Error('Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
        }

        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
            key_id: this.razorpayKeyId,
            key_secret: this.razorpayKeySecret
        });

        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency,
            receipt: `order_${orderId}`,
            notes: {
                orderId: orderId.toString(),
                customerName: customerInfo.name || '',
                customerEmail: customerInfo.email || ''
            }
        };

        try {
            const razorpayOrder = await razorpay.orders.create(options);
            return {
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                keyId: this.razorpayKeyId
            };
        } catch (error) {
            console.error('Razorpay order creation error:', error);
            throw new Error('Failed to create payment order');
        }
    }

    /**
     * Verify Razorpay payment signature
     */
    verifyRazorpayPayment(orderId, paymentId, signature) {
        if (!this.razorpayEnabled) {
            return false;
        }

        const text = `${orderId}|${paymentId}`;
        const generatedSignature = crypto
            .createHmac('sha256', this.razorpayKeySecret)
            .update(text)
            .digest('hex');

        return generatedSignature === signature;
    }

    /**
     * Process UPI payment (dummy/simulated)
     */
    async processUPIPayment(orderId, amount, upiData = {}) {
        // In production, verify with UPI payment gateway
        return {
            success: true,
            method: 'upi',
            transactionId: `UPI-${orderId}-${Date.now()}`,
            status: 'success',
            amount,
            upiRefId: upiData.upiRefId || `UPIREF${Date.now()}`,
            message: 'UPI payment successful'
        };
    }

    /**
     * Process COD payment (no actual processing needed)
     */
    async processCODPayment(orderId, amount) {
        return {
            success: true,
            method: 'COD',
            transactionId: `COD-${orderId}-${Date.now()}`,
            status: 'pending', // Will be confirmed on delivery
            amount,
            message: 'Payment will be collected on delivery'
        };
    }

    /**
     * Process online payment
     */
    async processOnlinePayment(orderId, amount, paymentMethod = 'razorpay', paymentData = {}) {
        if (paymentMethod === 'razorpay') {
            if (!this.razorpayEnabled) {
                // Fallback to mock payment for development
                return {
                    success: true,
                    method: 'online',
                    transactionId: `MOCK-TXN-${Date.now()}`,
                    status: 'success',
                    amount,
                    message: 'Mock payment successful (Razorpay not configured)'
                };
            }

            // Verify payment signature
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
            const isValid = this.verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

            if (!isValid) {
                return {
                    success: false,
                    error: 'Invalid payment signature'
                };
            }

            return {
                success: true,
                method: 'online',
                transactionId: razorpay_payment_id,
                status: 'success',
                amount,
                razorpayOrderId: razorpay_order_id
            };
        }

        // Add other payment gateways here (Paytm, Stripe, etc.)
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }

    /**
     * Get payment status
     */
    async getPaymentStatus(transactionId) {
        // In production, query payment gateway API
        return {
            transactionId,
            status: 'success',
            timestamp: new Date()
        };
    }

    /**
     * Create Razorpay Payment Link (Razorpay.me)
     * Supports both Razorpay.me simple links and Payment Links API
     * @param {string} farmerRazorpayUsername - Farmer's Razorpay.me username (e.g., 'mandhategopinathreddy')
     */
    async createPaymentLink(amount, currency = 'INR', orderId, customerInfo = {}, description = '', farmerRazorpayUsername = null, useSimpleLink = true) {
        // Use farmer's Razorpay.me username if provided, otherwise fallback to default
        const razorpayUsername = farmerRazorpayUsername || this.razorpayMeUsername;
        
        if (!razorpayUsername) {
            throw new Error('Razorpay.me username not configured. Please set farmer\'s Razorpay.me username or RAZORPAY_ME_USERNAME in .env');
        }

        // Use simple Razorpay.me link format (e.g., https://razorpay.me/@username/amount)
        if (useSimpleLink) {
            const simpleLink = `https://razorpay.me/@${razorpayUsername}/${Math.round(amount)}`;
            return {
                success: true,
                paymentLink: simpleLink,
                paymentLinkId: `simple_${Date.now()}`,
                amount: Math.round(amount),
                currency,
                shortUrl: simpleLink,
                type: 'simple',
                farmerAccount: razorpayUsername,
                message: `Pay ₹${Math.round(amount)} directly to farmer via Razorpay.me`
            };
        }

        // Use Razorpay Payment Links API (more advanced)
        if (!this.razorpayEnabled) {
            // Fallback to simple link if API not configured
            const simpleLink = `https://razorpay.me/@${this.razorpayMeUsername}/${Math.round(amount)}`;
            return {
                success: true,
                paymentLink: simpleLink,
                paymentLinkId: `plink_${Date.now()}`,
                amount: Math.round(amount),
                currency,
                shortUrl: simpleLink,
                type: 'simple',
                message: 'Using simple Razorpay.me link (API not configured)'
            };
        }

        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
            key_id: this.razorpayKeyId,
            key_secret: this.razorpayKeySecret
        });

        const options = {
            amount: amount * 100, // Amount in paise
            currency,
            description: description || `Payment for Order #${orderId}`,
            customer: {
                name: customerInfo.name || '',
                email: customerInfo.email || '',
                contact: customerInfo.phone || ''
            },
            notify: {
                sms: true,
                email: true
            },
            reminder_enable: true,
            notes: {
                orderId: orderId.toString(),
                customerName: customerInfo.name || ''
            },
            callback_url: process.env.PAYMENT_CALLBACK_URL || `${process.env.BASE_URL || 'http://localhost:8080'}/buyer/api/orders/${orderId}/payment-callback`,
            callback_method: 'get'
        };

        try {
            const paymentLink = await razorpay.paymentLink.create(options);
            return {
                success: true,
                paymentLink: paymentLink.short_url,
                paymentLinkId: paymentLink.id,
                amount: paymentLink.amount / 100,
                currency: paymentLink.currency,
                shortUrl: paymentLink.short_url,
                status: paymentLink.status
            };
        } catch (error) {
            console.error('Payment link creation error:', error);
            throw new Error('Failed to create payment link');
        }
    }

    /**
     * Get payment link status
     */
    async getPaymentLinkStatus(paymentLinkId) {
        if (!this.razorpayEnabled) {
            return {
                status: 'paid',
                message: 'Mock status (Razorpay not configured)'
            };
        }

        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
            key_id: this.razorpayKeyId,
            key_secret: this.razorpayKeySecret
        });

        try {
            const paymentLink = await razorpay.paymentLink.fetch(paymentLinkId);
            return {
                status: paymentLink.status,
                amount: paymentLink.amount / 100,
                currency: paymentLink.currency,
                payments: paymentLink.payments || []
            };
        } catch (error) {
            console.error('Payment link status error:', error);
            throw new Error('Failed to get payment link status');
        }
    }

    /**
     * Refund payment
     */
    async refundPayment(transactionId, amount, reason = '') {
        if (!this.razorpayEnabled) {
            return {
                success: true,
                refundId: `REFUND-${Date.now()}`,
                amount,
                status: 'processed',
                message: 'Mock refund processed (Razorpay not configured)'
            };
        }

        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
            key_id: this.razorpayKeyId,
            key_secret: this.razorpayKeySecret
        });

        try {
            const refund = await razorpay.payments.refund(transactionId, {
                amount: amount * 100, // Amount in paise
                notes: { reason }
            });

            return {
                success: true,
                refundId: refund.id,
                amount: refund.amount / 100,
                status: refund.status,
                transactionId
            };
        } catch (error) {
            console.error('Refund error:', error);
            throw new Error('Refund failed');
        }
    }
}

module.exports = new PaymentService();

