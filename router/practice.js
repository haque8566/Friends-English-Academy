const express = require("express");
const router = express.Router();
const Task = require("../model/task");
const TaskProgress = require("../model/taskProgress");
const wrapAsync = require("../util/wrapAsync");
const { isStudentOrAdmin } = require("../middleware");

// Helper to get local date string YYYY-MM-DD
function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// Level metadata
const LEVEL_CONFIG = {
    "a1-a2": {
        code: "a1-a2",
        name: "A1 – A2",
        subtitle: "Beginner Level Practice",
        badge: "Beginner",
        themeColor: "#2563eb",
        icon: "fa-book-open",
        description: "Practice foundational grammar, essential daily vocabulary, simple sentences, and everyday conversations."
    },
    "b1-b2": {
        code: "b1-b2",
        name: "B1 – B2",
        subtitle: "Intermediate Level Practice",
        badge: "Intermediate",
        themeColor: "#dc2626",
        icon: "fa-graduation-cap",
        description: "Improve conversational fluency, complex sentence structures, listening comprehension, and structured writing."
    },
    "c1-c2": {
        code: "c1-c2",
        name: "C1 – C2",
        subtitle: "Advanced Level Practice",
        badge: "Advanced",
        themeColor: "#7c3aed",
        icon: "fa-award",
        description: "Master native-level expressions, idioms, advanced presentation skills, critical reading, and professional communication."
    }
};

// Route: Base redirect to A1-A2
router.get("/", (req, res) => {
    res.redirect("/practice/a1-a2");
});

// Route: Level Practice Room
router.get(
    "/:level",
    isStudentOrAdmin,
    wrapAsync(async (req, res) => {
        const { level } = req.params;
        const levelConfig = LEVEL_CONFIG[level];

        if (!levelConfig) {
            req.flash("error", "Invalid learning level selected.");
            return res.redirect("/practice/a1-a2");
        }

        const todayDate = getLocalDateString();
        const currentMonth = todayDate.slice(0, 7); // e.g. "2026-11"

        // 1. Fetch all tasks for this level or universal tasks ('all')
        const allTasks = await Task.find({
            level: { $in: [level, "all"] }
        }).sort({ date: -1, createdAt: -1 });

        // Split into Today's Tasks and Previous/Archive Tasks
        const todayTasks = allTasks.filter(t => t.date === todayDate);
        const previousTasks = allTasks.filter(t => t.date !== todayDate);

        // 2. Fetch student's progress for this level and overall
        const studentProgressList = await TaskProgress.find({
            student: req.user._id
        });

        const completedTaskIdSet = new Set(
            studentProgressList.map(p => p.task.toString())
        );

        const progressMap = {};
        studentProgressList.forEach(p => {
            progressMap[p.task.toString()] = p;
        });

        // 3. Monthly Attendance / Study Days count for this student
        const monthProgressList = studentProgressList.filter(
            p => p.month === currentMonth
        );

        const studiedDaysSet = new Set(monthProgressList.map(p => p.date));
        const studiedDaysCount = studiedDaysSet.size;
        const studiedDaysList = Array.from(studiedDaysSet).sort();

        // Check if student completed today's practice
        const isStudiedToday = studiedDaysSet.has(todayDate);

        res.render("pages/practice", {
            currentLevel: level,
            levelConfig,
            LEVEL_CONFIG,
            todayDate,
            currentMonth,
            todayTasks,
            previousTasks,
            completedTaskIdSet,
            progressMap,
            studiedDaysCount,
            studiedDaysList,
            isStudiedToday
        });
    })
);

// Route: Complete Daily Task
router.post(
    "/:level/tasks/:taskId/complete",
    isStudentOrAdmin,
    wrapAsync(async (req, res) => {
        const { level, taskId } = req.params;
        const { submissionText } = req.body;

        const task = await Task.findById(taskId);
        if (!task) {
            req.flash("error", "Task not found.");
            return res.redirect(`/practice/${level}`);
        }

        const taskDate = task.date || getLocalDateString();
        const taskMonth = taskDate.slice(0, 7);

        let progress = await TaskProgress.findOne({
            student: req.user._id,
            task: task._id
        });

        if (!progress) {
            progress = new TaskProgress({
                student: req.user._id,
                task: task._id,
                level: task.level,
                date: taskDate,
                month: taskMonth,
                submissionText: (submissionText || "").trim(),
                completedAt: new Date()
            });
            await progress.save();
        } else {
            progress.submissionText = (submissionText || "").trim();
            progress.completedAt = new Date();
            await progress.save();
        }

        // Calculate updated monthly days
        const distinctDates = await TaskProgress.distinct("date", {
            student: req.user._id,
            month: taskMonth
        });

        req.flash(
            "success",
            `Awesome! Task marked as completed. You have practiced ${distinctDates.length} days this month! Keep it up! 🔥`
        );

        res.redirect(`/practice/${level}`);
    })
);

module.exports = router;
