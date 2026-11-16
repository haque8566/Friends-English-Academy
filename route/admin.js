const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../model/user");
const Offer = require("../model/offer");
const Contact = require("../model/contact");
const Consulting = require("../model/consulting");
const wrapAsync = require("../util/wrapAsync");
const { isAdmin, validateOffer, validateSignin, saveRedirectUrl } = require("../middleware");

// GET: Render Dedicated Admin Login Page (Public / unauthenticated access allowed)
router.get("/login", (req, res) => {
    if (req.isAuthenticated() && req.user.role === "admin") {
        req.flash("success", `Welcome back, Admin ${req.user.name}!`);
        return res.redirect("/admin");
    }
    res.render("pages/admin-login");
});

// POST: Handle Dedicated Admin Login
router.post(
    "/login",
    validateSignin,
    saveRedirectUrl,
    passport.authenticate("local", {
        failureRedirect: "/admin/login",
        failureFlash: "Invalid email or password. Please try again."
    }),
    wrapAsync(async (req, res) => {
        const adminKey = process.env.ADMIN_SECRET_KEY || "admin123";
        const { adminSecret } = req.body;

        // If user is currently a normal user, check if they provided the secret admin key to upgrade
        if (req.user.role !== "admin") {
            if (adminSecret && adminSecret.trim() === adminKey) {
                req.user.role = "admin";
                await req.user.save();
                req.flash("success", `Admin privileges successfully activated for ${req.user.name}!`);
            } else {
                req.flash(
                    "error",
                    "Access Denied: Your account currently has Student/User role. Enter the Admin Secret Key (admin123) to access the Admin Portal."
                );
                return res.redirect("/admin/login");
            }
        }

        // Track login activity
        try {
            req.user.lastLogin = new Date();
            req.user.loginCount = (req.user.loginCount || 0) + 1;
            if (!req.user.loginHistory) req.user.loginHistory = [];
            req.user.loginHistory.push({
                loginAt: new Date(),
                ip: req.ip || "Localhost"
            });
            await req.user.save();
        } catch (logErr) {
            console.error("Failed to update admin login log:", logErr);
        }

        req.flash("success", `Welcome to Admin Portal, ${req.user.name}!`);
        res.redirect("/admin");
    })
);

// Apply admin authorization to all subsequent routes in this router
router.use(isAdmin);

// Admin Dashboard: View all users, direct logins, offers, and enquiries
router.get(
    "/",
    wrapAsync(async (req, res) => {
        const users = await User.find({}).sort({ lastLogin: -1, createdAt: -1 });
        const offers = await Offer.find({}).sort({ createdAt: -1 });
        const contacts = await Contact.find({}).sort({ createdAt: -1 });
        const consultings = await Consulting.find({}).sort({ createdAt: -1 });

        res.render("pages/admin", {
            users,
            offers,
            contacts,
            consultings
        });
    })
);

// Create New Offer
router.post(
    "/offers",
    validateOffer,
    wrapAsync(async (req, res) => {
        const { title, discount, description, code, validTill, badge } = req.body;
        const offer = new Offer({
            title,
            discount,
            description,
            code: code ? code.toUpperCase().trim() : "",
            validTill: validTill ? validTill.trim() : "",
            badge: badge && badge.trim().length > 0 ? badge.trim() : "Special Offer",
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
    wrapAsync(async (req, res) => {
        const { id } = req.params;
        await Offer.findByIdAndDelete(id);
        req.flash("success", "Offer deleted successfully.");
        res.redirect("/admin");
    })
);

// Toggle User Role (Admin <-> User)
router.post(
    "/users/:id/toggle-role",
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

        targetUser.role = targetUser.role === "admin" ? "user" : "admin";
        await targetUser.save();

        req.flash(
            "success",
            `Updated ${targetUser.name}'s role to "${targetUser.role.toUpperCase()}".`
        );
        res.redirect("/admin");
    })
);

module.exports = router;
