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


// Routers
const adminRoutes = require("./router/admin");

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

// View Engine 
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

//  Parsers Method Override
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


// 1. HOME & PUBLIC STATIC ROUTES

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
    res.render("pages/note.ejs", {
        user: req.user
    });
});

// Contact Us Page (GET)
app.get("/contact", (req, res) => {
    res.render("pages/contact");
});

// Contact Us Joi validation 
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

// Free Consultation Booking Page 
app.get("/consulting", (req, res) => {
    res.render("pages/consulting");
});

// Free Consultation Booking Submission 
app.post(
    "/consulting",
    validateConsulting,
    wrapAsync(async (req, res) => {
        const { name, phone, email, level, timing, message } = req.body;
        const newConsultation = new Consulting({name,phone,email,level,timing,message});

        await newConsultation.save();

        req.flash("success","Thank you! Your free consultation request has been booked. We will get in touch soon.");
        res.redirect("/consulting");
    })
);


//  AUTHENTICATION ROUTES 


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

// Handle Sign in with Passport
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

//routerRoutes

app.use("/admin", adminRoutes);


//  ERROR HANDLING


// 404 All Route 
app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found"));
});

// Error Handler
app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong!" } = err;
    res.status(statusCode).render("pages/error", { statusCode, message });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
