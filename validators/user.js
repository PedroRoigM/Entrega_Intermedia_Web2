const { check, validationResult } = require('express-validator');
const validateResults = require("../utils/handleValidator");

const validatorRegister = [
    check('firstName')
        .notEmpty().withMessage('First name is required')
        .isLength({ min: 3 }).withMessage('Name must be at least 3 characters long')
        .trim(),
    check('lastName')
        .notEmpty().withMessage('Last name is required')
        .isLength({ min: 3 }).withMessage('Last name must be at least 3 characters long')
        .trim(),
    check('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email is invalid'),
    check('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    (req, res, next) => validateResults(req, res, next)
];

const validatorLogin = [
    check('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email is invalid'),
    check('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    (req, res, next) => validateResults(req, res, next)
];

const validatorValidateEmail = [
    check('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email is invalid'),
    check('code')
        .notEmpty().withMessage('Code is required')
        .isString().withMessage('Code must be a string'),
    (req, res, next) => validateResults(req, res, next)
];

const validatorCompanyPatch = [
    check('company').isObject().withMessage('Company is required'),
    check('company.name')
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 3 }).withMessage('Name must be at least 3 characters long')
        .trim(),
    check('company.cif')
        .notEmpty().withMessage('Cif is required')
        .isLength({ min: 9 }).withMessage('Cif must be at least 9 characters long')
        .trim(),
    check('company.address').optional().isObject().withMessage('Address must be an object'),
    check('company.address.street').optional()
        .isString().withMessage('Street must be a string')
        .trim(),
    check('company.address.number').optional()
        .isNumeric().withMessage('Number must be numeric'),
    check('company.address.postal').optional()
        .isNumeric().withMessage('Postal must be numeric'),
    check('company.address.city').optional()
        .isString().withMessage('City must be a string')
        .trim(),
    (req, res, next) => validateResults(req, res, next)
];

// Validador para recuperación de contraseña
const validatorRecoverPassword = [
    check('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email is invalid'),
    check('code')
        .notEmpty().withMessage('Code is required'),
    check('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    (req, res, next) => validateResults(req, res, next)
];

// Validador para crear código de recuperación
const validatorCreateRecoverCode = [
    check('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email is invalid'),
    (req, res, next) => validateResults(req, res, next)
];

// Validador para invitaciones
const validatorInviteUser = [
    check('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email is invalid'),
    check('role')
        .optional()
        .isIn(['invited', 'admin', 'user']).withMessage('Role must be: invited, admin or user'),
    (req, res, next) => validateResults(req, res, next)
];

// Validador para aceptar/rechazar invitaciones
const validatorHandleInvitation = [
    check('inviterId')
        .notEmpty().withMessage('Inviter ID is required'),
    (req, res, next) => validateResults(req, res, next)
];

module.exports = {
    validatorRegister,
    validatorLogin,
    validatorValidateEmail,
    validatorCompanyPatch,
    validatorRecoverPassword,
    validatorCreateRecoverCode,
    validatorInviteUser,
    validatorHandleInvitation
};