const mongoose = require("mongoose");
const plm = require("passport-local-mongoose");
const passportLocalMongoose = typeof plm === "function" ? plm : (plm.default || plm);

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },

    
    role: {
        type: String,
        enum: ["user", "admin","student"],
        default: "user"
    },
    lastLogin: {
        type: Date
    },


    loginCount: {
        type: Number,
        default: 0
    },



    loginHistory: [
        {
            loginAt: {
                type: Date,
                default: Date.now
            },
            ip: {
                type: String,
                default: "Localhost"
            }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.plugin(passportLocalMongoose, {
    usernameField: "email",
    usernameLowerCase: true
});

module.exports = mongoose.model("User", userSchema);
