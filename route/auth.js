const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../model/user");
const wrapAsync = require("../util/wrapAsync");
const { validateSignup, validateSignin, saveRedirectUrl } = require("../middleware");

// Render Sign Up Page (Unified in Sign In page)
router.get("/signup", (req, res) => {
    if (req.isAuthenticated()) {
        req.flash("success", "You are already signed in!");
        return res.redirect(req.user.role === "admin" ? "/admin" : "/");
    }
    res.render("pages/signin", { activeTab: "signup" });
});

// Handle Sign Up
router.post(
    "/signup",
    validateSignup,
    wrapAsync(async (req, res, next) => {
        try {
            const { name, email, phone, password, adminSecret } = req.body;

            // Check if user already exists
            const existingUser = await User.findOne({
                email: new RegExp("^" + email.trim() + "$", "i")
            });
            if (existingUser) {
                req.flash("error", "An account with this email is already registered. Please sign in.");
                return res.redirect("/signin");
            }

            // Check if first user or correct admin secret key
            const userCount = await User.countDocuments();
            const adminKey = process.env.ADMIN_SECRET_KEY || "admin123";
            let role = "user";
            
            if (adminSecret && adminSecret.trim() === adminKey) {
                role = "admin";
            } else if (userCount === 0) {
                // First registered user automatically becomes Admin
                role = "admin";
            }

            const newUser = new User({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                phone: phone ? phone.trim() : "",
                role,
                lastLogin: new Date(),
                loginCount: 1,
                loginHistory: [
                    {
                        loginAt: new Date(),
                        ip: req.ip || "Localhost"
                    }
                ]
            });

            const registeredUser = await User.register(newUser, password);

            req.login(registeredUser, (err) => {
                if (err) return next(err);
                if (role === "admin") {
                    req.flash("success", `Welcome Admin ${registeredUser.name}! Your admin account is now active.`);
                    return res.redirect("/admin");
                }
                req.flash("success", `Welcome to Friends English Academy, ${registeredUser.name}!`);
                res.redirect("/");
            });
        } catch (err) {
            req.flash("error", err.message || "Registration failed. Please try again.");
            res.redirect("/signup");
        }
    })
);

// Render Sign In Page
router.get("/signin", (req, res) => {
    if (req.isAuthenticated()) {
        req.flash("success", "You are already signed in!");
        return res.redirect(req.user.role === "admin" ? "/admin" : "/");
    }
    const activeTab = req.query.tab === "signup" ? "signup" : "signin";
    res.render("pages/signin", { activeTab });
});

// Handle Sign In with Passport
router.post(
    "/signin",
    validateSignin,
    saveRedirectUrl,
    passport.authenticate("local", {
        failureRedirect: "/signin",
        failureFlash: "Invalid email or password. Please try again."
    }),
    wrapAsync(async (req, res) => {
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
            console.error("Failed to update user login log:", logErr);
        }

        const roleMsg = req.user.role === "admin" ? " (Admin)" : "";
        req.flash("success", `Welcome back, ${req.user.name}${roleMsg}!`);

        let redirectUrl = res.locals.redirectUrl;
        if (redirectUrl && redirectUrl.startsWith("/admin") && req.user.role !== "admin") {
            redirectUrl = "/admin/login";
        }
        res.redirect(redirectUrl || (req.user.role === "admin" ? "/admin" : "/"));
    })
);

// Handle Logout
router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.flash("success", "You have successfully signed out. See you soon!");
        res.redirect("/");
    });
});

module.exports = router;
