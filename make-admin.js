require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./model/user");

const MONGO_URI =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/friend-english-academy";

async function main() {
    const targetEmail = process.argv[2];

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
            console.log("\nTo make any user an Admin, run:");
            console.log("  node make-admin.js <email>\n");
            process.exit(0);
        }

        const user = await User.findOne({
            email: new RegExp("^" + targetEmail.trim() + "$", "i")
        });

        if (!user) {
            console.error(`Error: User with email "${targetEmail}" not found in database.`);
            process.exit(1);
        }

        user.role = "admin";
        await user.save();

        console.log(`\n SUCCESS: User "${user.name}" (${user.email}) is now an ADMIN!`);
        console.log("You can now login at http://localhost:3000/admin/login or http://localhost:3000/signin\n");
        process.exit(0);
    } catch (err) {
        console.error("Database connection error:", err.message);
        process.exit(1);
    }
}

main();
