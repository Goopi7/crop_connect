const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderItemSchema = new Schema({
  crop: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 }
}, { _id: false });

const orderSchema = new Schema({
  buyer: { type: Schema.Types.ObjectId, ref: 'BuyerLogin', required: true },
  farmer: { type: Schema.Types.ObjectId, ref: 'FarmerLogin', required: true },
  items: { type: [orderItemSchema], default: [] },
  subtotal: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0.05 },
  taxAmount: { type: Number, required: true, min: 0 },
  grandTotal: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['created','paid','shipped','completed','cancelled'], default: 'created' },
  payment: {
    method: { type: String, enum: ['COD','online','upi'], default: 'COD' },
    txnId: { type: String },
    status: { type: String, enum: ['pending','success','failed'], default: 'pending' },
    meta: { type: Schema.Types.Mixed }
  },
  shipping: {
    name: { type: String },
    phone: { type: String },
    address: { type: String },
    pincode: { type: String }
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
