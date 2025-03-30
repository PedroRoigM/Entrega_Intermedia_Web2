const mongoose = require('mongoose')
const mongooseDelete = require("mongoose-delete")

const addressSchema = new mongoose.Schema({
    street: {
        type: String,
        trim: true
    },
    number: {
        type: Number,
        min: 0
    },
    postal: {
        type: Number,
        min: 0
    },
    city: {
        type: String,
        trim: true
    }
}, { _id: false });

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true
    },
    cif: {
        type: String,
        trim: true
    },
    address: addressSchema,
    partners: [{
        _id: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ["invited", "admin", "user"],
            required: true
        }
    }]
}, { _id: false });

const invitationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    email: {
        type: String,
        trim: true,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending"
    }
}, { _id: false });

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        trim: true,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    company: companySchema,
    invitations: [invitationSchema],
    acceptedInvitations: [invitationSchema],
    sentInvitations: [invitationSchema],
    validated: { type: Boolean, default: false },
    logo: { type: String },
    accountStatus: {
        validated: {
            type: Boolean,
            default: false
        },
        active: {
            type: Boolean,
            default: false
        },
        verificationCode: {
            type: String
        },
        codeExpiration: {
            type: Date
        },
        passwordResetCode: {
            type: String
        },
        passwordResetExpiration: {
            type: Date
        },
        loginAttempts: {
            type: Number,
            default: 0
        },
        lastLoginAttempt: {
            type: Date
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

// Índices del modelo
userSchema.index({ 'email': 1 }, { unique: true })
userSchema.index({ 'company.name': 1 }, { unique: true })
userSchema.index({ 'company.cif': 1 }, { unique: true })

userSchema.plugin(mongooseDelete, { overrideMethods: "all" }) // Soft delete

// Sí el código de verificación aún persiste y no ha expirado, para luego comprobar si es válido
userSchema.methods.isVerificationCodeValid = function () {
    return this.accountStatus.verificationCode &&
        this.accountStatus.codeExpiration &&
        this.accountStatus.codeExpiration > new Date()
};

// Igual para la contraseña
userSchema.methods.isPasswordResetCodeValid = function () {
    return this.accountStatus.passwordResetCode &&
        this.accountStatus.passwordResetExpiration &&
        this.accountStatus.passwordResetExpiration > new Date()
};

module.exports = mongoose.model('User', userSchema)