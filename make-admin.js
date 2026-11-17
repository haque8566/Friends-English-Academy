require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./model/user");

const MONGO_URI =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/friend-english-academy";

async function main() {
    const targetEmail = process.argv[2];
    const targetRole = (process.argv[3] || "admin").toLowerCase();

    const allowedRoles = ["user", "student", "admin"];
    if (!allowedRoles.includes(targetRole)) {
        console.error(`Invalid role: "${targetRole}". Allowed roles are: ${allowedRoles.join(", ")}`);
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB.");

        if (!targetEmail) {
            console.log("\n--- Current Users in Database ---");
            const allUsers = await User.find({});
            if (allUsers.length === 0) {
                console.log("No users found. Please sign up on http://localhost:3000/signup first.");
            } else {
                allUsers.forEach((u, i) => {
                    console.log(
                        `${i + 1}. Name: ${u.name} | Email: ${u.email} | Role: ${u.role}`
                    );
                });
            }
            console.log("\nTo change any user's role, run:");
            console.log("  node make-admin.js <email> [admin | student | user]\n");
            process.exit(0);
        }

        const user = await User.findOne({
            email: new RegExp("^" + targetEmail.trim() + "$", "i")
        });

        if (!user) {
            console.error(`Error: User with email "${targetEmail}" not found in database.`);
            process.exit(1);
        }

        const prevRole = user.role;
        user.role = targetRole;
        await user.save();

        console.log(`\n SUCCESS: User "${user.name}" (${user.email}) role changed: ${prevRole} -> ${user.role.toUpperCase()}!`);
        process.exit(0);
    } catch (err) {
        console.error("Database connection error:", err.message);
        process.exit(1);
    }
}

main();
