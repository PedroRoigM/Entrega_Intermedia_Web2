const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/session');
const { getUser,
    registerUser,
    loginUser,
    verifyEmail,
    patchUser,
    patchCompany,
    patchLogo,
    deleteUser,
    recoverPassword,
    createRecoverPasswordCode,
    patchInviteUser,
    patchAcceptInviteUser,
    patchRejectInviteUser
} = require('../controllers/user');
const { validatorRegister,
    validatorLogin,
    validatorValidateEmail,
    validatorCompanyPatch } = require('../validators/user');
const { uploadMiddlewareMemory } = require('../utils/handleStorage');

router.get('/profile', authMiddleware, getUser);

router.post('/register', validatorRegister, registerUser);
router.post('/login', validatorLogin, loginUser);
router.put('/verify', validatorValidateEmail, verifyEmail);
router.patch('/', authMiddleware, patchUser);
router.patch('/company', authMiddleware, validatorCompanyPatch, patchCompany);
router.patch('/logo', authMiddleware, uploadMiddlewareMemory.single("image"), patchLogo);
router.delete('/', authMiddleware, deleteUser);

router.post('/recover', createRecoverPasswordCode);
router.patch('/recover', recoverPassword);
router.patch('/invite', authMiddleware, patchInviteUser);
router.patch('/invite/accept', authMiddleware, patchAcceptInviteUser);
router.patch('/invite/reject', authMiddleware, patchRejectInviteUser);
module.exports = router;