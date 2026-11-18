const mongoose = require("mongoose");

const taskProgressSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        required: true,
        index: true
    },
    level: {
        type: String,
        enum: ["a1-a2", "b1-b2", "c1-c2", "all"],
        required: true
    },
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true,
        index: true
    },
    month: {
        type: String, // Format: YYYY-MM for instant monthly grouping
        required: true,
        index: true
    },
    submissionText: {
        type: String,
        default: "",
        trim: true
    },
    completedAt: {
        type: Date,
        default: Date.now
    }
});

// Avoid duplicate submissions for the same student and task
taskProgressSchema.index({ student: 1, task: 1 }, { unique: true });

module.exports = mongoose.model("TaskProgress", taskProgressSchema);
