const {
    userSignupSchema,
    userLoginSchema,
    contactSchema,
    consultingSchema,
    offerSchema
} = require("./schema");

const ExpressError = require("./util/ExpressError");


// ==========================================
// 1. CHECK USER AUTHENTICATION
// ==========================================

module.exports.isLoggedIn = (req, res, next) => {

    if (!req.isAuthenticated()) {

        req.session.redirectUrl = req.originalUrl;

        req.flash("error", "You must be signed in to access this page!");

        return res.redirect("/signin");
    }

    next();
};


// ==========================================
// 2. SAVE REDIRECT URL
// ==========================================

module.exports.saveRedirectUrl = (req, res, next) => {

    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }

    next();
};


// ==========================================
// 3. CHECK ADMIN AUTHORIZATION
// ==========================================

module.exports.isAdmin = (req, res, next) => {

    // Check authentication
    if (!req.isAuthenticated()) {

        req.session.redirectUrl = req.originalUrl;

        req.flash(
            "error",
            "Please sign in as Admin to access the Admin Portal!"
        );

        return res.redirect("/admin/login");
    }

    // Check admin role
    if (!req.user || req.user.role !== "admin") {

        req.flash(
            "error",
            "Access Denied! Admin privileges are required."
        );

        return res.redirect("/admin/login");
    }

    next();
};


// ==========================================
// 4. SIGNUP VALIDATION
// ==========================================

module.exports.validateSignup = (req, res, next) => {

    const { error } = userSignupSchema.validate(
        req.body,
        { abortEarly: false }
    );

    if (error) {

        const errMsg = error.details
            .map(el => el.message)
            .join(" | ");

        req.flash("error", errMsg);

        return res.redirect("/signup");
    }

    next();
};


// ==========================================
// 5. SIGNIN VALIDATION
// ==========================================

module.exports.validateSignin = (req, res, next) => {

    const { error } = userLoginSchema.validate(
        req.body,
        { abortEarly: false }
    );

    if (error) {

        const errMsg = error.details
            .map(el => el.message)
            .join(" | ");

        req.flash("error", errMsg);

        return res.redirect("/signin");
    }

    next();
};


// ==========================================
// 6. CONTACT FORM VALIDATION
// ==========================================

module.exports.validateContact = (req, res, next) => {

    const { error } = contactSchema.validate(
        req.body,
        { abortEarly: false }
    );

    if (error) {

        const errMsg = error.details
            .map(el => el.message)
            .join(" | ");

        req.flash("error", errMsg);

        return res.redirect("/contact");
    }

    next();
};


// ==========================================
// 7. CONSULTING FORM VALIDATION
// ==========================================

module.exports.validateConsulting = (req, res, next) => {

    const { error } = consultingSchema.validate(
        req.body,
        { abortEarly: false }
    );

    if (error) {

        const errMsg = error.details
            .map(el => el.message)
            .join(" | ");

        req.flash("error", errMsg);

        return res.redirect("/consulting");
    }

    next();
};


// ==========================================
// 8. OFFER VALIDATION
// ==========================================

module.exports.validateOffer = (req, res, next) => {

    const { error } = offerSchema.validate(
        req.body,
        { abortEarly: false }
    );

    if (error) {

        const errMsg = error.details
            .map(el => el.message)
            .join(" | ");

        req.flash("error", errMsg);

        return res.redirect("/admin#new-offer-card");
    }

    next();
};