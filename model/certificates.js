const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    level: {
        type: String,
        required: true,
        trim: true
    },
    dob: {
        type: Date,
        required: true
    },
    grammar: {
        type: String,
        required: true,
        trim: true
    },
    listening: {
        type: String,
        required: true,
        trim: true
    },
    speaking: {
        type: String,
        required: true,
        trim: true
    },
    reading: {
        type: String,
        required: true,
        trim: true
    },
    overall: {
        type: String,
        required: true,
        trim: true
    },
    certificateNo: {
        type: String,
        trim: true
    },
    courseName: {
        type: String,
        default: "Spoken English Programme",
        trim: true
    },
    levelDescription: {
        type: String,
        default: "(Beginner to Elementary)",
        trim: true
    },
    duration: {
        type: String,
        default: "13 Weeks",
        trim: true
    },
    awardedDate: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const LEVEL_DESCRIPTIONS = {
    "A1 - A2 LEVEL": "(Beginner to Elementary)",
    "A1 - B1 LEVEL": "(Beginner to Intermediate)",
    "B1 - B2 LEVEL": "(Intermediate to Upper-Intermediate)",
    "B1 - C1 LEVEL": "(Intermediate to Advanced)",
    "C1 - C2 LEVEL": "(Advanced to Proficient)"
};

/**
 * Returns the CEFR level description corresponding to a course level string.
 */
function getLevelDescription(level) {
    const trimmed = (level || "").trim();
    if (LEVEL_DESCRIPTIONS[trimmed]) {
        return LEVEL_DESCRIPTIONS[trimmed];
    }
    if (trimmed.includes("A1")) return "(Beginner to Elementary)";
    if (trimmed.includes("C1")) return "(Advanced to Proficient)";
    return "(Intermediate to Upper-Intermediate)";
}

const Certificate = mongoose.model("Certificate", certificateSchema);
Certificate.LEVEL_DESCRIPTIONS = LEVEL_DESCRIPTIONS;
Certificate.getLevelDescription = getLevelDescription;

module.exports = Certificate;
