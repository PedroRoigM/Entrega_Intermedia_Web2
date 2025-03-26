const mongoose = require('mongoose')
const mongooseDelete = require("mongoose-delete")
const Schema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    company: {
        name: { type: String },
        cif: { type: String },
        street: { type: String },
        number: { type: Number },
        postal: { type: Number },
        city: { type: String },
        province: { type: String },
        invited: [{
            _id: { type: String },
            email: { type: String },
            role: { type: String },
            status: { type: String, default: "pending" }
        }] // Array of invited users
    },
    invitations: [{
        _id: { type: String },
        email: { type: String },
        role: { type: String },
        status: { type: String, default: "pending" }
    }], // Array of invitations
    validated: { type: Boolean, default: false },
    logo: { type: String },
    code: { type: String },
    attempts: { type: Number }
}, {
    timestamps: true,
    versionKey: false
});

Schema.plugin(mongooseDelete, { overrideMethods: "all" }) // Soft delete
module.exports = mongoose.model('User', Schema)