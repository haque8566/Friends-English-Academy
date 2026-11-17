const express = require("express");
const router = express.Router();
const passport = require("passport");

// Models
const User = require("../model/user");
const Contact = require("../model/contact");
const Consulting = require("../model/consulting");
const Offer = require("../model/offer");

// Middleware
const {
    isAdmin,
    validateSignin,
    validateOffer
} = require("../middleware");

const wrapAsync = require("../util/wrapAsync");



//  ADMIN LOGIN ROUTES


// GET: Admin Login
router.get("/login", (req, res) => {
    if (req.isAuthenticated() && req.user.role === "admin") {
        req.flash("success", `Welcome back, Admin ${req.user.name}!`);
        return res.redirect("/admin");
    }

    res.render("pages/admin-login");
});



// POST: Admin Login
router.post("/login", validateSignin, (req, res, next) => {

    const { email, adminSecret } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();
    const adminKey = process.env.ADMIN_SECRET_KEY || "admin123";

    passport.authenticate("local", (err, user, info) => {

        if (err) return next(err);

        if (!user) {
            req.flash("error", "Invalid email or password.");
            return res.redirect("/admin/login");
        }

        req.login(user, async (loginErr) => {

            if (loginErr) return next(loginErr);

            if (user.role !== "admin") {

                if (adminSecret && adminSecret.trim() === adminKey) {
                    user.role = "admin";
                    await user.save();

                    req.flash("success", `Admin privileges granted! Welcome ${user.name}.`);

                } else {
                    req.flash("error", "Access Denied: Invalid Admin Secret Key.");
                    return res.redirect("/admin/login");
                }
            }

            // Login Statistics
            try {
                user.lastLogin = new Date();
                user.loginCount = (user.loginCount || 0) + 1;

                if (!user.loginHistory) user.loginHistory = [];

                user.loginHistory.push({
                    loginAt: new Date(),
                    ip: req.ip || "Localhost"
                });

                await user.save();

            } catch (logErr) {
                console.error("Failed to update admin login log:", logErr);
            }

            req.flash("success", `Welcome to Admin Portal, ${user.name}!`);

            delete req.session.redirectUrl;

            res.redirect("/admin");
        });

    })(req, res, next);
});



//  ADMIN DASHBOARD


router.get(
    "/",
    isAdmin,
    wrapAsync(async (req, res) => {

        const users = await User.find({})
            .sort({ lastLogin: -1, createdAt: -1 });

        const offers = await Offer.find({})
            .sort({ createdAt: -1 });

        const contacts = await Contact.find({})
            .sort({ createdAt: -1 });

        const consultings = await Consulting.find({})
            .sort({ createdAt: -1 });

        res.render("pages/admin", {
            users,
            offers,
            contacts,
            consultings
        });
    })
);



// OFFER MANAGEMENT

// Create Offer
router.post(
    "/offers",
    isAdmin,
    validateOffer,
    wrapAsync(async (req, res) => {

        const {
            title,
            discount,
            description,
            code,
            validTill,
            badge
        } = req.body;

        const offer = new Offer({
            title,
            discount,
            description,
            code: code ? code.toUpperCase().trim() : "",
            validTill: validTill ? validTill.trim() : "",
            badge: badge && badge.trim().length > 0
                ? badge.trim()
                : "Special Offer",
            createdBy: req.user._id,
            isActive: true
        });

        await offer.save();

        req.flash("success", `Offer "${offer.title}" created and published successfully!`);

        res.redirect("/admin");
    })
);


// Toggle Offer Active / Inactive
router.post(
    "/offers/:id/toggle",
    isAdmin,
    wrapAsync(async (req, res) => {

        const { id } = req.params;

        const offer = await Offer.findById(id);

        if (!offer) {
            req.flash("error", "Offer not found.");
            return res.redirect("/admin");
        }

        offer.isActive = !offer.isActive;

        await offer.save();

        req.flash(
            "success",
            `Offer status changed to: ${offer.isActive ? "Active (Live on website)" : "Paused"}`
        );

        res.redirect("/admin");
    })
);


// Delete Offer
router.post(
    "/offers/:id/delete",
    isAdmin,
    wrapAsync(async (req, res) => {

        const { id } = req.params;

        await Offer.findByIdAndDelete(id);

        req.flash("success", "Offer deleted successfully.");

        res.redirect("/admin");
    })
);



// 4. USER  MANAGEMENT


router.post(
    "/users/:id/toggle-role",
    isAdmin,
    wrapAsync(async (req, res) => {

        const { id } = req.params;

        if (req.user._id.toString() === id.toString()) {
            req.flash("error", "You cannot modify your own admin role.");
            return res.redirect("/admin");
        }

        const targetUser = await User.findById(id);

        if (!targetUser) {
            req.flash("error", "User not found.");
            return res.redirect("/admin");
        }

        if (targetUser.role === "admin") {
            targetUser.role = "user";

        } else if (targetUser.role === "user") {
            targetUser.role = "student";

        } else {
            targetUser.role = "admin";
        }

        await targetUser.save();

        req.flash(
            "success",
            `Updated ${targetUser.name}'s role to "${targetUser.role.toUpperCase()}".`
        );

        res.redirect("/admin");
    })
);


module.exports = router;