
const express = require("express");
const router = express.Router();
const passport = require("passport");


// MODELS


const User = require("../model/user");
const Contact = require("../model/contact");
const Consulting = require("../model/consulting");
const Offer = require("../model/offer");
const Task = require("../model/task");
const TaskProgress = require("../model/taskProgress");
const Certificate = require("../model/certificates");
const Review = require("../model/review");


// MIDDLEWARE


const {
    isAdmin,
    validateSignin,
    validateOffer
} = require("../middleware");

const wrapAsync = require("../util/wrapAsync");



// ADMIN LOGIN


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


// Helper to get local date string YYYY-MM-DD
function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}


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

        const tasks = await Task.find({})
            .sort({ date: -1, createdAt: -1 });

        const certificates = await Certificate.find({})
            .sort({ createdAt: -1 });

        const reviews = await Review.find({})
            .sort({ createdAt: -1 });

        const todayDate = getLocalDateString();
        const selectedMonth = req.query.month || todayDate.slice(0, 7);

        // Fetch monthly task progress records
        const monthProgress = await TaskProgress.find({ month: selectedMonth });

        // Calculate attendance for all enrolled students
        const students = users.filter(u => u.role === "student");
        const studentAttendance = students.map(s => {
            const studentRecords = monthProgress.filter(
                p => p.student.toString() === s._id.toString()
            );
            const daysSet = new Set(studentRecords.map(p => p.date));
            const latestRecord = studentRecords.sort(
                (a, b) => new Date(b.completedAt) - new Date(a.completedAt)
            )[0];

            return {
                _id: s._id,
                name: s.name,
                email: s.email,
                phone: s.phone,
                daysStudied: daysSet.size,
                daysList: Array.from(daysSet).sort(),
                tasksCount: studentRecords.length,
                lastActive: latestRecord ? latestRecord.completedAt : null
            };
        }).sort((a, b) => b.daysStudied - a.daysStudied);

        res.render("pages/admin", {
            users,
            offers,
            contacts,
            consultings,
            tasks,
            studentAttendance,
            certificates,
            reviews,
            selectedMonth,
            todayDate
        });

    })
);



//  CREATE OFFER


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



// TOGGLE OFFER


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



// DELETE OFFER


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



//  USER ROLE MANAGEMENT


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



// DELETE USER


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



//  DAILY TASKS MANAGEMENT


// Create Daily Task
router.post(
    "/tasks",
    isAdmin,
    wrapAsync(async (req, res) => {
        const { level, date, category, title, description, hintOrResource, checklist } = req.body;

        if (!title || !description) {
            req.flash("error", "Task Title and Description are required.");
            return res.redirect("/admin#tasks-pane");
        }

        const checklistItems = checklist
            ? checklist
                .split("\n")
                .map(item => item.trim())
                .filter(item => item.length > 0)
            : [];

        const task = new Task({
            level: level || "a1-a2",
            date: date || getLocalDateString(),
            category: category || "Daily Challenge",
            title: title.trim(),
            description: description.trim(),
            hintOrResource: hintOrResource ? hintOrResource.trim() : "",
            checklist: checklistItems,
            createdBy: req.user._id
        });

        await task.save();

        req.flash(
            "success",
            `Daily Task "${task.title}" posted successfully for Level: ${task.level.toUpperCase()} on ${task.date}!`
        );

        res.redirect("/admin#tasks-pane");
    })
);

// Delete Daily Task
router.post(
    "/tasks/:id/delete",
    isAdmin,
    wrapAsync(async (req, res) => {
        const { id } = req.params;
        const task = await Task.findById(id);

        if (!task) {
            req.flash("error", "Task not found.");
            return res.redirect("/admin#tasks-pane");
        }

        const taskTitle = task.title;
        await Task.findByIdAndDelete(id);
        // Also cleanup associated progress
        await TaskProgress.deleteMany({ task: id });

        req.flash("success", `Task "${taskTitle}" deleted successfully.`);
        res.redirect("/admin#tasks-pane");
    })
);



//  CERTIFICATES MANAGEMENT


// Issue / Generate New Certificate (Admin Only)
router.post(
    "/certificates/generate",
    isAdmin,
    wrapAsync(async (req, res) => {
        const {
            username,
            level,
            dob,
            userId,
            grammar,
            listening,
            speaking,
            reading,
            overall,
            courseName,
            duration,
            awardedDate
        } = req.body;

        if (!username || !level || !dob) {
            req.flash("error", "Student name, course level, and date of birth are required.");
            return res.redirect("/admin#certificates-pane");
        }

        // Generate serial certificate number
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
            levelDescription: Certificate.getLevelDescription(level),
            duration: duration ? duration.trim() : "13 Weeks",
            awardedDate: awardedDate ? new Date(awardedDate) : new Date(),
            user: (userId && userId.trim()) ? userId.trim() : null
        });

        await newCertificate.save();
        console.log("Admin Issued Certificate:", newCertificate.certificateNo, "for", newCertificate.username);

        req.flash("success", `Certificate successfully issued for ${newCertificate.username} (Cert No: ${newCertificate.certificateNo})!`);
        res.redirect("/admin#certificates-pane");
    })
);

// Edit Certificate
router.post(
    "/certificates/:id/edit",
    isAdmin,
    wrapAsync(async (req, res) => {
        const { id } = req.params;
        const {
            username,
            level,
            dob,
            grammar,
            listening,
            speaking,
            reading,
            overall,
            certificateNo,
            courseName,
            duration
        } = req.body;

        const certificate = await Certificate.findById(id);
        if (!certificate) {
            req.flash("error", "Certificate not found.");
            return res.redirect("/admin#certificates-pane");
        }

        if (username) certificate.username = username.trim();
        if (level) {
            certificate.level = level.trim();
            certificate.levelDescription = Certificate.getLevelDescription(level);
        }
        if (dob) certificate.dob = new Date(dob);
        if (grammar) certificate.grammar = grammar;
        if (listening) certificate.listening = listening;
        if (speaking) certificate.speaking = speaking;
        if (reading) certificate.reading = reading;
        if (overall) certificate.overall = overall;
        if (certificateNo) certificate.certificateNo = certificateNo.trim();
        if (courseName) certificate.courseName = courseName.trim();
        if (duration) certificate.duration = duration.trim();

        await certificate.save();

        req.flash("success", `Certificate for "${certificate.username}" updated successfully!`);
        res.redirect("/admin#certificates-pane");
    })
);

// Delete Certificate
router.post(
    "/certificates/:id/delete",
    isAdmin,
    wrapAsync(async (req, res) => {
        const { id } = req.params;
        const cert = await Certificate.findByIdAndDelete(id);
        req.flash("success", `Certificate ${cert ? cert.certificateNo || '' : ''} deleted successfully.`);
        res.redirect("/admin#certificates-pane");
    })
);


// ==========================================
// 10. REVIEWS MANAGEMENT
// ==========================================

// Toggle Review Approval / Visibility
router.post(
    "/reviews/:id/toggle",
    isAdmin,
    wrapAsync(async (req, res) => {
        const { id } = req.params;
        const review = await Review.findById(id);
        if (!review) {
            req.flash("error", "Review not found.");
            return res.redirect("/admin#reviews-pane");
        }

        review.isApproved = !review.isApproved;
        await review.save();

        req.flash(
            "success",
            `Review by "${review.name}" is now ${review.isApproved ? "Visible on website" : "Hidden from website"}.`
        );
        res.redirect("/admin#reviews-pane");
    })
);

// Delete Review
router.post(
    "/reviews/:id/delete",
    isAdmin,
    wrapAsync(async (req, res) => {
        const { id } = req.params;
        const review = await Review.findByIdAndDelete(id);
        req.flash(
            "success",
            `Review by "${review ? review.name : 'Student'}" deleted successfully.`
        );
        res.redirect("/admin#reviews-pane");
    })
);


module.exports = router;
