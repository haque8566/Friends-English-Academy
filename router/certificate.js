const express = require("express");
const router = express.Router();
const QRCode = require("qrcode");
const Certificate = require("../model/certificates");
const wrapAsync = require("../util/wrapAsync");
const { isLoggedIn, isAdmin } = require("../middleware");

// Helper to escape regex special characters
function escapeRegex(text) {
    if (!text) return "";
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /certificate - Search / Generate Hub
router.get(
    "/",
    isLoggedIn,
    wrapAsync(async (req, res) => {
        let userCertificates = [];
        try {
            const orConditions = [{ user: req.user._id }];
            if (req.user && req.user.name) {
                orConditions.push({ username: new RegExp("^" + escapeRegex(req.user.name.trim()) + "$", "i") });
            }
            userCertificates = await Certificate.find({ $or: orConditions }).sort({ createdAt: -1 });
        } catch (e) {
            console.error("Could not fetch user certificates:", e);
        }

        res.render("pages/certificateform", {
            userCertificates
        });
    })
);

// GET /certificate/form - Alternate link for generator
router.get("/form", isLoggedIn, (req, res) => {
    res.redirect("/certificate");
});

// POST /certificate/generate - Only Admin Can Generate Certificates
router.post(
    "/generate",
    isLoggedIn,
    wrapAsync(async (req, res) => {
        // Enforce Admin Only
        if (!req.user || req.user.role !== "admin") {
            req.flash("error", "Access Denied! Only Academy Admin can issue and generate certificates. Students can search and download their certificates below.");
            return res.redirect("/certificate");
        }

        const {
            username,
            level,
            dob,
            grammar,
            listening,
            speaking,
            reading,
            overall,
            courseName,
            duration,
            awardedDate,
            userId
        } = req.body;

        if (!username || !level || !dob) {
            req.flash("error", "Student name, course level, and date of birth are required.");
            return res.redirect("/certificate");
        }

        // Count for serial number
        const count = await Certificate.countDocuments();
        const year = new Date().getFullYear();
        const certificateNo = `FEA/SE/${year}/${String(count + 1).padStart(3, "0")}`;

        const newCertificate = new Certificate({
            username: username.trim(),
            level: level.trim(),
            dob: new Date(dob),
            grammar: grammar || "B1",
            listening: listening || "A2",
            speaking: speaking || "A2",
            reading: reading || "A2",
            overall: overall || "A2",
            certificateNo,
            courseName: courseName ? courseName.trim() : "Spoken English Programme",
            levelDescription: level.includes("A1") ? "(Beginner to Elementary)" : (level.includes("C1") ? "(Advanced to Mastery)" : "(Intermediate to Upper-Intermediate)"),
            duration: duration ? duration.trim() : "13 Weeks",
            awardedDate: awardedDate ? new Date(awardedDate) : new Date(),
            user: userId || null
        });

        await newCertificate.save();
        console.log("Certificate Generated & Saved by Admin:", newCertificate.certificateNo);

        req.flash("success", `Certificate successfully issued for ${newCertificate.username}! You can view or download the PDF.`);
        res.redirect(`/certificate/${newCertificate._id}`);
    })
);

// POST /certificate/search - Look up certificate by Name and Date of Birth
router.post(
    "/search",
    isLoggedIn,
    wrapAsync(async (req, res) => {
        const { name, dob } = req.body;

        if (!name || !dob) {
            req.flash("error", "Please provide both Full Name and Date of Birth to search for a certificate.");
            return res.redirect("/certificate");
        }

        const trimmedName = name.trim();
        const searchDate = new Date(dob);

        const startOfDay = new Date(searchDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(searchDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Find certificate matching name and DOB
        const certificate = await Certificate.findOne({
            username: new RegExp("^" + escapeRegex(trimmedName) + "$", "i"),
            dob: { $gte: startOfDay, $lte: endOfDay }
        });

        if (!certificate) {
            req.flash(
                "error",
                `No certificate found for Name "${trimmedName}" and Date of Birth "${dob}". Please verify details or generate one below.`
            );
            return res.redirect("/certificate");
        }

        req.flash("success", `Certificate found for ${certificate.username}!`);
        res.redirect(`/certificate/${certificate._id}`);
    })
);

// GET /certificate/verify/:id - Public QR Code Verification page
router.get(
    "/verify/:id",
    wrapAsync(async (req, res) => {
        try {
            const certificate = await Certificate.findById(req.params.id);
            res.render("pages/verify-certificate", {
                certificate
            });
        } catch (err) {
            res.render("pages/verify-certificate", {
                certificate: null
            });
        }
    })
);

// GET /certificate/:id - View & Download Certificate page
router.get(
    "/:id",
    isLoggedIn,
    wrapAsync(async (req, res) => {
        const certificate = await Certificate.findById(req.params.id);

        if (!certificate) {
            req.flash("error", "Certificate not found.");
            return res.redirect("/certificate");
        }

        // Generate QR code pointing to official verification URL
        const verifyUrl = `${req.protocol}://${req.get("host")}/certificate/verify/${certificate._id}`;
        let qrCode = "";
        try {
            qrCode = await QRCode.toDataURL(verifyUrl, {
                width: 140,
                margin: 1,
                color: {
                    dark: "#102c55",
                    light: "#ffffff"
                }
            });
        } catch (qrErr) {
            console.error("QR Code generation error:", qrErr);
        }

        res.render("pages/certificate", {
            certificate,
            qrCode
        });
    })
);

module.exports = router;
