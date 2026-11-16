require("dotenv").config();

const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const methodOverride = require("method-override");

// Models
const User = require("./model/user");
const Contact = require("./model/contact");
const Consulting = require("./model/consulting");
const Offer = require("./model/offer");

// Utils & Middleware
const ExpressError = require("./util/ExpressError");
const wrapAsync = require("./util/wrapAsync");
const {
    isLoggedIn,
    isAdmin,
    validateSignup,
    validateSignin,
    validateContact,
    validateConsulting,
    validateOffer
} = require("./middleware");

// Database Connection
const MONGO_URI =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/friend-english-academy";

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log("Connected to MongoDB successfully!");
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err.message);
    });

// View Engine & Static Assets
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Body Parsers & Method Override
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

// Session Configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || "friendsenglishacademysecretkey2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
};

app.use(session(sessionConfig));
app.use(flash());

// Passport Configuration
app.use(passport.initialize());
app.use(passport.session());

// Configure passport-local-mongoose strategy
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Global Locals Middleware for Flash Messages and Auth User
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currentUser = req.user;
    next();
});

// ==========================================
// 1. HOME & PUBLIC STATIC ROUTES
// ==========================================

// Home Page: Loads active offers for students
app.get(
    "/",
    wrapAsync(async (req, res) => {
        let activeOffers = [];
        try {
            activeOffers = await Offer.find({ isActive: true }).sort({
                createdAt: -1
            });
        } catch (e) {
            console.error("Could not fetch offers for homepage:", e.message);
        }
        res.render("pages/index.ejs", { activeOffers });
    })
);

// About Us Page
app.get("/about", (req, res) => {
    res.render("pages/about");
});

// Study Notes (Protected Route: Students must be signed in)
app.get("/notes", isLoggedIn, (req, res) => {
    res.render("pages/note.ejs");
});

// Contact Us Page (GET)
app.get("/contact", (req, res) => {
    res.render("pages/contact");
});

// Contact Us Form Submission (POST with Joi validation & DB storage)
app.post(
    "/contact",
    validateContact,
    wrapAsync(async (req, res) => {
        const { name, phone, email, course, message } = req.body;
        const newContact = new Contact({
            name,
            phone,
            email,
            course,
            message
        });

        await newContact.save();

        req.flash(
            "success",
            "Thank you! Your enquiry has been received. Our counselor will contact you shortly."
        );
        res.redirect("/contact");
    })
);

// Free Consultation Booking Page (GET)
app.get("/consulting", (req, res) => {
    res.render("pages/consulting");
});

// Free Consultation Booking Submission (POST with Joi validation & DB storage)
app.post(
    "/consulting",
    validateConsulting,
    wrapAsync(async (req, res) => {
        const { name, phone, email, level, timing, message } = req.body;
        const newConsultation = new Consulting({
            name,
            phone,
            email,
            level,
            timing,
            message
        });

        await newConsultation.save();

        req.flash(
            "success",
            "Thank you! Your free consultation request has been booked. We will get in touch soon."
        );
        res.redirect("/consulting");
    })
);

// ==========================================
// 2. AUTHENTICATION ROUTES (USER / STUDENT)
// ==========================================

// Render Sign Up (Unified in Sign In page)
app.get("/signup", (req, res) => {
    if (req.isAuthenticated()) {
        req.flash("success", "You are already signed in!");
        return res.redirect(req.user.role === "admin" ? "/admin" : "/");
    }
    res.render("pages/signin", { activeTab: "signup" });
});

// Handle Sign Up (POST)
app.post(
    "/signup",
    validateSignup,
    wrapAsync(async (req, res, next) => {
        try {
            const { name, email, phone, password, adminSecret } = req.body;
            const normalizedEmail = email.trim().toLowerCase();

            // Check if user already exists
            const existingUser = await User.findOne({ email: normalizedEmail });
            if (existingUser) {
                req.flash(
                    "error",
                    "An account with this email is already registered. Please sign in."
                );
                return res.redirect("/signin");
            }

            // Check if first user or correct admin secret key
            const userCount = await User.countDocuments();
            const adminKey = process.env.ADMIN_SECRET_KEY || "admin123";
            let role = "user";

            if (
                (adminSecret && adminSecret.trim() === adminKey) ||
                userCount === 0
            ) {
                role = "admin";
            }

            const newUser = new User({
                name: name.trim(),
                email: normalizedEmail,
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
            console.log(
                "New user registered:",
                registeredUser.email,
                "Role:",
                registeredUser.role
            );

            req.login(registeredUser, (err) => {
                if (err) return next(err);
                if (role === "admin") {
                    req.flash(
                        "success",
                        `Welcome Admin ${registeredUser.name}! Your admin account is now active.`
                    );
                    return res.redirect("/admin");
                }
                req.flash(
                    "success",
                    `Welcome to Friends English Academy, ${registeredUser.name}!`
                );
                res.redirect("/");
            });
        } catch (err) {
            console.error("Signup error:", err);
            req.flash("error", err.message || "Registration failed. Please try again.");
            res.redirect("/signup");
        }
    })
);

// Render Sign In Page
app.get("/signin", (req, res) => {
    if (req.isAuthenticated()) {
        req.flash("success", "You are already signed in!");
        return res.redirect(req.user.role === "admin" ? "/admin" : "/");
    }
    const activeTab = req.query.tab === "signup" ? "signup" : "signin";
    res.render("pages/signin", { activeTab });
});

// Handle Sign In (POST) with Passport
app.post("/signin", validateSignin, (req, res, next) => {
    const { email, password } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    console.log("Login attempt received for email:", normalizedEmail);

    passport.authenticate("local", (err, user, info) => {
        if (err) {
            console.error("Auth internal error:", err);
            return next(err);
        }

        if (!user) {
            console.log("Login failed. Reason:", info ? info.message : "User not found or password mismatch");
            req.flash("error", "Invalid email or password. Please check your credentials.");
            return res.redirect("/signin");
        }

        req.login(user, async (loginErr) => {
            if (loginErr) return next(loginErr);

            // Record login statistics
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
                console.error("Failed to update user login log:", logErr);
            }

            console.log("User logged in successfully:", user.email, "Role:", user.role);

            const roleMsg = user.role === "admin" ? " (Admin)" : "";
            req.flash("success", `Welcome back, ${user.name}${roleMsg}!`);

            // If session redirect was set to admin but user is not admin, redirect to homepage
            let redirectUrl = req.session.redirectUrl;
            delete req.session.redirectUrl;

            if (redirectUrl && redirectUrl.startsWith("/admin") && user.role !== "admin") {
                redirectUrl = "/";
            }

            res.redirect(redirectUrl || (user.role === "admin" ? "/admin" : "/"));
        });
    })(req, res, next);
});

// Handle Logout
app.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.flash("success", "You have successfully signed out. See you soon!");
        res.redirect("/");
    });
});

// ==========================================
// 3. ADMIN PORTAL & ADMIN LOGIN ROUTES
// ==========================================

// GET: Render Dedicated Admin Login Page
app.get("/admin/login", (req, res) => {
    if (req.isAuthenticated() && req.user.role === "admin") {
        req.flash("success", `Welcome back, Admin ${req.user.name}!`);
        return res.redirect("/admin");
    }
    res.render("pages/admin-login");
});

// POST: Handle Admin Login (Supports instant upgrade with adminSecret key)
app.post("/admin/login", validateSignin, (req, res, next) => {
    const { email, adminSecret } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();
    const adminKey = process.env.ADMIN_SECRET_KEY || "admin123";

    console.log("Admin login attempt for:", normalizedEmail);

    passport.authenticate("local", (err, user, info) => {
        if (err) {
            console.error("Admin Login Auth Error:", err);
            return next(err);
        }

        if (!user) {
            console.log("Admin Login failed. Reason:", info ? info.message : "User not found or password mismatch");
            req.flash("error", "Invalid email or password. Please try again.");
            return res.redirect("/admin/login");
        }

        req.login(user, async (loginErr) => {
            if (loginErr) return next(loginErr);

            // If user role is NOT admin, check if they provided the secret key to upgrade
            if (user.role !== "admin") {
                if (adminSecret && adminSecret.trim() === adminKey) {
                    user.role = "admin";
                    await user.save();
                    console.log(`User ${user.email} successfully upgraded to ADMIN role!`);
                    req.flash("success", `Admin privileges granted! Welcome ${user.name}.`);
                } else {
                    console.log(`User ${user.email} denied admin access (role is ${user.role} and secret key not provided).`);
                    req.flash(
                        "error",
                        "Access Denied: Your account is not an Admin. Please enter Admin Secret Key (admin123) to access."
                    );
                    return res.redirect("/admin/login");
                }
            }

            // Record login statistics
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

            console.log("Admin logged in successfully:", user.email);
            req.flash("success", `Welcome to Admin Portal, ${user.name}!`);
            delete req.session.redirectUrl;
            res.redirect("/admin");
        });
    })(req, res, next);
});

// Admin Dashboard: View all users, direct logins, offers, and enquiries
app.get(
    "/admin",
    isAdmin,
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
app.post(
    "/admin/offers",
    isAdmin,
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
app.post(
    "/admin/offers/:id/toggle",
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
app.post(
    "/admin/offers/:id/delete",
    isAdmin,
    wrapAsync(async (req, res) => {
        const { id } = req.params;
        await Offer.findByIdAndDelete(id);
        req.flash("success", "Offer deleted successfully.");
        res.redirect("/admin");
    })
);

// Toggle User Role (Admin <-> User)
app.post(
    "/admin/users/:id/toggle-role",
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

        targetUser.role = targetUser.role === "admin" ? "user" : "admin";
        await targetUser.save();

        req.flash(
            "success",
            `Updated ${targetUser.name}'s role to "${targetUser.role.toUpperCase()}".`
        );
        res.redirect("/admin");
    })
);

// ==========================================
// 4. ERROR HANDLING
// ==========================================

// 404 Catch-All Route (Express 5 compatible)
app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found"));
});

// Global Error Handler
app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong!" } = err;
    res.status(statusCode).render("pages/error", { statusCode, message });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
