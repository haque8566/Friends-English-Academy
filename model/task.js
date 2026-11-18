const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    level: {
        type: String,
        enum: ["a1-a2", "b1-b2", "c1-c2", "all"],
        required: true,
        default: "a1-a2"
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true,
        index: true
    },
    category: {
        type: String,
        enum: ["Daily Challenge", "Speaking Practice", "Grammar Rule", "Vocabulary Builder", "Reading & Comprehension", "Writing Task"],
        default: "Daily Challenge"
    },
    description: {
        type: String,
        required: true
    },
    checklist: [
        {
            type: String,
            trim: true
        }
    ],
    hintOrResource: {
        type: String,
        default: "",
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Task", taskSchema);
