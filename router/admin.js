
const express = require("express");
const router = express.Router();
const passport = require("passport");

// ==========================================
// MODELS
// ==========================================

const User = require("../model/user");
const Contact = require("../model/contact");
const Consulting = require("../model/consulting");
const Offer = require("../model/offer");

// ==========================================
// MIDDLEWARE
// ==========================================

const {
    isAdmin,
    validateSignin,
    validateOffer
} = require("../middleware");

const wrapAsync = require("../util/wrapAsync");


// ==========================================
// 1. ADMIN LOGIN
// ==========================================

// GET: Admin Login

router.get("/login", (req, res) => {

    // Already logged-in admin
    if (req.isAuthenticated() && req.user.role === "admin") {
        return res.redirect("/admin");
    }

    res.render("pages/admin-login");
});


// POST: Admin Login

router.post("/login", validateSignin, (req, res, next) => {

    const { adminSecret } = req.body;

    const adminKey = process.env.ADMIN_SECRET_KEY;

    passport.authenticate("local", (err, user, info) => {

        if (err) return next(err);

        if (!user) {
            req.flash("error", "Invalid email or password.");
            return res.redirect("/admin/login");
        }

        req.login(user, async (loginErr) => {

            if (loginErr) return next(loginErr);

            try {

                // Check Admin Role
                if (user.role !== "admin") {

                    if (
                        adminSecret &&
                        adminKey &&
                        adminSecret.trim() === adminKey
                    ) {

                        user.role = "admin";

                        await user.save();

                    } else {

                        req.logout((logoutErr) => {
                            if (logoutErr) return next(logoutErr);

                            req.flash(
                                "error",
                                "Access Denied: Invalid Admin Secret Key."
                            );

                            res.redirect("/admin/login");
                        });

                        return;
                    }
                }

                // Login Statistics
                user.lastLogin = new Date();

                user.loginCount = (user.loginCount || 0) + 1;

                if (!user.loginHistory) {
                    user.loginHistory = [];
                }

                user.loginHistory.push({
                    loginAt: new Date(),
                    ip: req.ip || "Localhost"
                });

                await user.save();

                req.flash(
                    "success",
                    `Welcome to Admin Portal, ${user.name}!`
                );

                delete req.session.redirectUrl;

                res.redirect("/admin");

            } catch (error) {
                next(error);
            }

        });

    })(req, res, next);

});


// ==========================================
// 2. ADMIN DASHBOARD
// ==========================================

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


// ==========================================
// 3. CREATE OFFER
// ==========================================

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

            code: code
                ? code.toUpperCase().trim()
                : "",

            validTill: validTill
                ? validTill.trim()
                : "",

            badge: badge && badge.trim().length > 0
                ? badge.trim()
                : "Special Offer",

            createdBy: req.user._id,

            isActive: true

        });

        await offer.save();

        req.flash(
            "success",
            `Offer "${offer.title}" created successfully!`
        );

        res.redirect("/admin");

    })
);


// ==========================================
// 4. TOGGLE OFFER
// ==========================================

router.post(
    "/offers/:id/toggle",
    isAdmin,
    wrapAsync(async (req, res) => {

        const offer = await Offer.findById(req.params.id);

        if (!offer) {
            req.flash("error", "Offer not found.");
            return res.redirect("/admin");
        }

        offer.isActive = !offer.isActive;

        await offer.save();

        req.flash(
            "success",
            `Offer is now ${offer.isActive ? "Active" : "Paused"}.`
        );

        res.redirect("/admin");

    })
);


// ==========================================
// 5. DELETE OFFER
// ==========================================

router.post(
    "/offers/:id/delete",
    isAdmin,
    wrapAsync(async (req, res) => {

        const offer = await Offer.findById(req.params.id);

        if (!offer) {
            req.flash("error", "Offer not found.");
            return res.redirect("/admin");
        }

        await Offer.findByIdAndDelete(req.params.id);

        req.flash("success", "Offer deleted successfully.");

        res.redirect("/admin");

    })
);


// ==========================================
// 6. USER ROLE MANAGEMENT
// ==========================================

// Direct Role Assignment (user, student, admin)
router.post(
    "/users/:id/role",
    isAdmin,
    wrapAsync(async (req, res) => {
        const { id } = req.params;
        const { role } = req.body;

        const allowedRoles = ["user", "student", "admin"];
        if (!role || !allowedRoles.includes(role)) {
            req.flash("error", "Invalid role selected. Allowed roles: user, student, admin.");
            return res.redirect("/admin");
        }

        // Prevent changing own role to avoid self-lockout
        if (req.user._id.toString() === id) {
            req.flash(
                "error",
                "You cannot modify your own admin role."
            );
            return res.redirect("/admin");
        }

        // Find Target User
        const targetUser = await User.findById(id);
        if (!targetUser) {
            req.flash("error", "User not found.");
            return res.redirect("/admin");
        }

        const previousRole = targetUser.role || "user";
        targetUser.role = role;
        await targetUser.save();

        console.log(
            `Role Updated: ${targetUser.email} (${previousRole} -> ${targetUser.role})`
        );

        req.flash(
            "success",
            `Successfully updated ${targetUser.name}'s role to ${targetUser.role.toUpperCase()}.`
        );

        res.redirect("/admin");
    })
);

// Toggle / Cycle User Role (user -> student -> admin -> user)
router.post(
    "/users/:id/toggle-role",
    isAdmin,
    wrapAsync(async (req, res) => {

        const { id } = req.params;

        // Prevent changing own role
        if (req.user._id.toString() === id) {

            req.flash(
                "error",
                "You cannot modify your own admin role."
            );

            return res.redirect("/admin");
        }

        // Find User
        const targetUser = await User.findById(id);

        if (!targetUser) {

            req.flash("error", "User not found.");

            return res.redirect("/admin");
        }

        // Role Cycle: user -> student -> admin -> user
        const previousRole = targetUser.role || "user";

        if (previousRole === "user") {
            targetUser.role = "student";
        } else if (previousRole === "student") {
            targetUser.role = "admin";
        } else {
            targetUser.role = "user";
        }

        // Save Database
        await targetUser.save();

        console.log(
            `Role Updated: ${targetUser.email}`,
            `${previousRole} -> ${targetUser.role}`
        );

        req.flash(
            "success",
            `${targetUser.name} is now ${targetUser.role.toUpperCase()}.`
        );

        res.redirect("/admin");

    })
);


// ==========================================
// 7. DELETE USER
// ==========================================

router.post(
    "/users/:id/delete",
    isAdmin,
    wrapAsync(async (req, res) => {
        const { id } = req.params;

        // Prevent self deletion
        if (req.user._id.toString() === id) {
            req.flash("error", "You cannot delete your own admin account.");
            return res.redirect("/admin");
        }

        const targetUser = await User.findById(id);
        if (!targetUser) {
            req.flash("error", "User not found.");
            return res.redirect("/admin");
        }

        const userName = targetUser.name;
        await User.findByIdAndDelete(id);

        console.log(`User Deleted: ${targetUser.email}`);
        req.flash("success", `User "${userName}" has been deleted successfully.`);
        res.redirect("/admin");
    })
);


// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
