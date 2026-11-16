require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./model/user");

const MONGO_URI =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/friend-english-academy";

async function main() {
    const email = process.argv[2];
    const newPassword = process.argv[3];

    if (!email || !newPassword) {
        console.log("Usage: node reset-password.js <email> <newPassword>");
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        const user = await User.findOne({
            email: new RegExp("^" + email.trim() + "$", "i")
        });

        if (!user) {
            console.error(`User with email "${email}" not found.`);
            process.exit(1);
        }

        await user.setPassword(newPassword);
        user.role = "admin"; // Ensure admin role
        await user.save();

        console.log(`\n Password successfully reset for ${user.email}!`);
        console.log(`Role: ${user.role}`);
        console.log(`You can now sign in with your new password at http://localhost:3000/signin or http://localhost:3000/admin/login\n`);
        process.exit(0);
    } catch (err) {
        console.error("Error resetting password:", err.message);
        process.exit(1);
    }
}

main();
