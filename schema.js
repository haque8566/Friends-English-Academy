const Joi = require("joi");

// User Signup Validation Schema
const userSignupSchema = Joi.object({
    name: Joi.string().trim().min(2).max(60).required().messages({
        "string.base": "Name must be text",
        "string.empty": "Name cannot be empty",
        "string.min": "Name must be at least 2 characters long",
        "any.required": "Full Name is required"
    }),
    email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
        "string.empty": "Email cannot be empty",
        "string.email": "Please provide a valid email address",
        "any.required": "Email address is required"
    }),
    phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required().messages({
        "string.empty": "Phone number cannot be empty",
        "string.pattern.base": "Phone number must be a valid 10-digit Indian mobile number (starting with 6-9)",
        "any.required": "Mobile number is required"
    }),
    password: Joi.string().min(6).max(32).required().messages({
        "string.empty": "Password cannot be empty",
        "string.min": "Password must be at least 6 characters long",
        "string.max": "Password cannot exceed 32 characters",
        "any.required": "Password is required"
    }),
    adminSecret: Joi.string().trim().allow("", null)
});

// User Login Validation Schema
const userLoginSchema = Joi.object({
    email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
        "string.empty": "Email is required",
        "string.email": "Please enter a valid email address",
        "any.required": "Email is required"
    }),
    password: Joi.string().required().messages({
        "string.empty": "Password is required",
        "any.required": "Password is required"
    }),
    adminSecret: Joi.string().trim().allow("", null)
});

// Contact Form Validation Schema
const contactSchema = Joi.object({
    name: Joi.string().trim().min(2).max(80).required().messages({
        "string.empty": "Name is required",
        "string.min": "Name must be at least 2 characters",
        "any.required": "Full Name is required"
    }),
    phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required().messages({
        "string.empty": "Phone number is required",
        "string.pattern.base": "Phone number must be a valid 10-digit mobile number",
        "any.required": "Phone number is required"
    }),
    email: Joi.string().trim().email({ tlds: { allow: false } }).allow("", null).messages({
        "string.email": "Please enter a valid email address"
    }),
    course: Joi.string().trim().required().messages({
        "string.empty": "Please select a course",
        "any.required": "Course is required"
    }),
    message: Joi.string().trim().max(1000).allow("", null)
});

// Consulting Form Validation Schema
const consultingSchema = Joi.object({
    name: Joi.string().trim().min(2).max(80).required().messages({
        "string.empty": "Name is required",
        "string.min": "Name must be at least 2 characters",
        "any.required": "Full Name is required"
    }),
    phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required().messages({
        "string.empty": "Phone number is required",
        "string.pattern.base": "Phone number must be a valid 10-digit mobile number",
        "any.required": "Phone number is required"
    }),
    email: Joi.string().trim().email({ tlds: { allow: false } }).allow("", null).messages({
        "string.email": "Please enter a valid email address"
    }),
    level: Joi.string().trim().required().messages({
        "string.empty": "Please select your English level",
        "any.required": "Current level is required"
    }),
    timing: Joi.string().trim().required().messages({
        "string.empty": "Please select preferred batch timing",
        "any.required": "Batch timing is required"
    }),
    message: Joi.string().trim().max(1000).allow("", null)
});

// Offer Validation Schema
const offerSchema = Joi.object({
    title: Joi.string().trim().min(3).max(100).required().messages({
        "string.empty": "Offer title is required",
        "string.min": "Title must be at least 3 characters",
        "any.required": "Title is required"
    }),
    discount: Joi.string().trim().min(2).max(50).required().messages({
        "string.empty": "Discount text is required (e.g. '50% OFF')",
        "any.required": "Discount is required"
    }),
    description: Joi.string().trim().min(5).max(500).required().messages({
        "string.empty": "Offer description is required",
        "string.min": "Description must be at least 5 characters",
        "any.required": "Description is required"
    }),
    code: Joi.string().trim().uppercase().max(20).allow("", null),
    validTill: Joi.string().trim().allow("", null),
    badge: Joi.string().trim().max(30).allow("", null),
    isActive: Joi.boolean().default(true)
});

// Review Validation Schema
const reviewSchema = Joi.object({
    name: Joi.string().trim().min(2).max(80).required().messages({
        "string.empty": "Name is required",
        "string.min": "Name must be at least 2 characters",
        "any.required": "Full Name is required"
    }),
    rating: Joi.number().min(1).max(5).required().messages({
        "number.base": "Rating must be a number between 1 and 5",
        "number.min": "Rating must be at least 1 star",
        "number.max": "Rating cannot exceed 5 stars",
        "any.required": "Star rating is required"
    }),
    course: Joi.string().trim().max(100).allow("", null),
    comment: Joi.string().trim().min(5).max(1000).required().messages({
        "string.empty": "Review text cannot be empty",
        "string.min": "Review must be at least 5 characters long",
        "any.required": "Review message is required"
    })
});

module.exports = {
    userSignupSchema,
    userLoginSchema,
    contactSchema,
    consultingSchema,
    offerSchema,
    reviewSchema
};
