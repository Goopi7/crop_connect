const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 80
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    role: {
        type: String,
        default: 'admin',
        enum: ['admin', 'superadmin']
    },
    permissions: [{
        type: String,
        enum: ['manage_users', 'manage_inventory', 'view_analytics', 'manage_system']
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add passport-local-mongoose plugin for authentication
adminSchema.plugin(passportLocalMongoose, {
    usernameField: 'username',
    usernameUnique: true
});

// Index for better performance
// Note: passport-local-mongoose already defines username indexes
adminSchema.index({ role: 1 });

// Virtual for admin display name
adminSchema.virtual('displayName').get(function() {
    return `${this.username} (${this.role})`;
});

// Method to check if admin has specific permission
adminSchema.methods.hasPermission = function(permission) {
    return this.permissions.includes(permission) || this.role === 'superadmin';
};

// Method to update last login
adminSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

// Pre-save middleware to ensure superadmin has all permissions
adminSchema.pre('save', function(next) {
    if (this.role === 'superadmin') {
        this.permissions = ['manage_users', 'manage_inventory', 'view_analytics', 'manage_system'];
    }
    next();
});

module.exports = mongoose.model('AdminLogin', adminSchema);
