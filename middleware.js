module.exports.redirectPath=(req,res,next)=>{
    if(req.session.redirectpath){
        res.locals.redirect=req.session.redirectpath;
    }
    next();
}

module.exports.isFarmer=(req, res, next)=> {
    if (req.user && req.user.constructor.modelName === "FarmerLogin") return next();
    req.flash("error", "Access denied.");
    res.redirect("/");
}
module.exports.isLoggedIn=(req, res, next) =>{
    // Check if user is authenticated by checking req.user (set by Passport)
    // Also check req.isAuthenticated if available (for compatibility)
    if (!req.user && (!req.isAuthenticated || !req.isAuthenticated())) {
        req.flash("error", "You must be logged in first!");
        return res.redirect("/");
    }
    next();
}

module.exports.isAdmin=(req, res, next)=>{
    if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.constructor && req.user.constructor.modelName === "AdminLogin") {
        return next();
    }
    const wantsJson = req.xhr || (req.headers['x-requested-with'] === 'XMLHttpRequest') || (req.headers.accept && req.headers.accept.includes('application/json'));
    if (wantsJson) {
        return res.status(401).json({ error: "Admin access required." });
    }
    req.flash("error", "Admin access required.");
    res.redirect("/");
}

module.exports.isBuyer=(req, res, next)=>{
    if (req.user && req.user.constructor.modelName === "BuyerLogin") return next();
    req.flash("error", "Buyer access required.");
    res.redirect("/");
}

module.exports.hasAdminPermission=(permission) => {
    return (req, res, next) => {
        if (req.user && req.user.constructor.modelName === "AdminLogin") {
            if (req.user.hasPermission(permission) || req.user.role === 'superadmin') {
                return next();
            }
        }
        req.flash("error", `Permission '${permission}' required.`);
        res.redirect("/");
    };
}