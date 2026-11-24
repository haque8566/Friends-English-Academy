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

const Certificate = mongoose.model("Certificate", certificateSchema);

module.exports = Certificate;
