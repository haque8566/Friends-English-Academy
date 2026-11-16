const {
    userSignupSchema,
    userLoginSchema,
    contactSchema,
    consultingSchema,
    offerSchema
} = require("./schema");
const ExpressError = require("./util/ExpressError");

// Check if user is authenticated
module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be signed in to access this page!");
        return res.redirect("/signin");
    }
    next();
};

// Save original redirect URL before login
module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
};

// Check if authenticated user is Admin
module.exports.isAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "Please sign in as Admin to access the Admin Portal!");
        return res.redirect("/admin/login");
    }
    if (req.user.role !== "admin") {
        req.flash("error", "Access Denied: Your account currently has Student/User role. Enter Admin Secret Key to access Admin Portal.");
        return res.redirect("/admin/login");
    }
    next();
};

// Joi Middleware: User Signup
module.exports.validateSignup = (req, res, next) => {
    const { error } = userSignupSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errMsg = error.details.map((el) => el.message).join(" | ");
        req.flash("error", errMsg);
        return res.redirect("/signup");
    }
    next();
};

// Joi Middleware: User Login
module.exports.validateSignin = (req, res, next) => {
    const { error } = userLoginSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errMsg = error.details.map((el) => el.message).join(" | ");
        req.flash("error", errMsg);
        return res.redirect("/signin");
    }
    next();
};

// Joi Middleware: Contact Form
module.exports.validateContact = (req, res, next) => {
    const { error } = contactSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errMsg = error.details.map((el) => el.message).join(" | ");
        req.flash("error", errMsg);
        return res.redirect("/contact");
    }
    next();
};

// Joi Middleware: Consulting Form
module.exports.validateConsulting = (req, res, next) => {
    const { error } = consultingSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errMsg = error.details.map((el) => el.message).join(" | ");
        req.flash("error", errMsg);
        return res.redirect("/consulting");
    }
    next();
};

// Joi Middleware: Offer Form
module.exports.validateOffer = (req, res, next) => {
    const { error } = offerSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errMsg = error.details.map((el) => el.message).join(" | ");
        req.flash("error", errMsg);
        return res.redirect("/admin#new-offer");
    }
    next();
};
