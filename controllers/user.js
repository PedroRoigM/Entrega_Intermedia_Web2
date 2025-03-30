/**
 * Controladores para operaciones de usuario
 */
const { matchedData } = require('express-validator');
const { handleHttpError } = require("../utils/handleError");
const userService = require('../services/user.service');

/**
 * Obtener los datos del usuario autenticado
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getUser = async (req, res) => {
    res.json(req.user);
};

/**
 * Registrar un nuevo usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const registerUser = async (req, res) => {
    try {
        const userData = matchedData(req);
        const result = await userService.register(userData);
        res.send(result);
    } catch (error) {
        console.log(error);
        // Pasar el error directamente, handleHttpError se encargará de extraer status y mensaje
        handleHttpError(res, error);
    }
};

/**
 * Verificar correo electrónico
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        const result = await userService.verifyEmail(email, code);
        res.send(result);
    } catch (error) {
        console.log(error);
        // Pasar el error directamente
        handleHttpError(res, error);
    }
};

/**
 * Login de usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const loginUser = async (req, res) => {
    try {
        const { email, password } = matchedData(req);
        const result = await userService.login(email, password);
        res.send(result);
    } catch (error) {
        // Usar el código de estado del error, o 500 por defecto
        const status = error.status || 500;
        const message = error.message || "ERROR_LOGIN_USER";
        handleHttpError(res, message, status);
    }
};


/**
 * Actualizar información del usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const patchUser = async (req, res) => {
    try {
        const { _id } = req.user;
        const userData = req.body;
        const result = await userService.updateUser(_id, userData);
        res.send(result);
    } catch (error) {
        console.log(error);
        // Pasar el error directamente
        handleHttpError(res, error);
    }
};

/**
 * Actualizar información de la empresa
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const patchCompany = async (req, res) => {
    try {
        const user = req.user;
        const { company } = req.body;

        if (!company) {
            return handleHttpError(res, "COMPANY_DATA_REQUIRED", 400);
        }

        console.log('Company data received:', company);

        // Verificar si hay conflictos con nombre o CIF de compañía
        if (company.name || company.cif) {
            const nameExists = company.name && await userModel.findOne({
                'company.name': company.name,
                _id: { $ne: user._id }
            });

            const cifExists = company.cif && await userModel.findOne({
                'company.cif': company.cif,
                _id: { $ne: user._id }
            });

            if (nameExists) {
                return handleHttpError(res, "COMPANY_NAME_ALREADY_EXISTS", 409);
            }

            if (cifExists) {
                return handleHttpError(res, "COMPANY_CIF_ALREADY_EXISTS", 409);
            }
        }

        // Actualizar la compañía
        const updatedUser = await userModel.findByIdAndUpdate(
            user._id,
            { $set: { company } },
            { new: true }
        );

        // Devolver solo la respuesta que espera el test
        return res.send(updatedUser);
    } catch (err) {
        console.log('Error updating company:', err);
        handleHttpError(res, "ERROR_PATCH_COMPANY", 500);
    }
};


/**
 * Actualizar logo de la empresa
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const patchLogo = async (req, res) => {
    try {
        const { _id } = req.user;
        const file = {
            buffer: req.file.buffer,
            originalname: req.file.originalname
        };
        const result = await userService.updateProfilePicture(_id, file);
        res.send(result);
    } catch (error) {
        console.log(error);
        // Pasar el error directamente
        handleHttpError(res, error);
    }
};

/**
 * Eliminar usuario (soft o hard delete)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const deleteUser = async (req, res) => {
    try {
        const { _id } = req.user;
        const { soft = 'true' } = req.query;
        const isSoft = soft === 'true';
        const result = await userService.deleteUser(_id, isSoft);
        res.send(result);
    } catch (error) {
        console.log(error);
        // Pasar el error directamente
        handleHttpError(res, error);
    }
};

/**
 * Crear código de recuperación de contraseña
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const createRecoverPasswordCode = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await userService.createRecoverCode(email);
        res.send(result);
    } catch (error) {
        console.log(error);
        // Pasar el error directamente
        handleHttpError(res, error);
    }
};

/**
 * Recuperar contraseña con código
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const recoverPassword = async (req, res) => {
    try {
        const { email, code, password } = req.body;
        const result = await userService.recoverPassword(email, code, password);
        res.send(result);
    } catch (error) {
        console.log(error);
        // Pasar el error directamente
        handleHttpError(res, error);
    }
};

/**
 * Invitar a otro usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const patchInviteUser = async (req, res) => {
    try {
        const currentUser = req.user;
        const { email, role } = req.body;
        const result = await userService.inviteUser(currentUser, email, role);
        res.send(result);
    } catch (error) {
        console.log(error);
        // Pasar el error directamente
        handleHttpError(res, error);
    }
};

/**
 * Aceptar invitación de otro usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const patchAcceptInviteUser = async (req, res) => {
    try {
        const currentUser = req.user;
        const { inviterId } = req.body;
        const result = await userService.acceptInvitation(currentUser, inviterId);
        res.send(result);
    } catch (error) {
        console.log(error);
        // Pasar el error directamente
        handleHttpError(res, error);
    }
};

/**
 * Rechazar invitación de otro usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const patchRejectInviteUser = async (req, res) => {
    try {
        const currentUser = req.user;
        const { inviterId } = req.body;
        const result = await userService.rejectInvitation(currentUser, inviterId);
        res.send(result);
    } catch (error) {
        console.log(error);
        // Pasar el error directamente
        handleHttpError(res, error);
    }
};

module.exports = {
    getUser,
    registerUser,
    loginUser,
    verifyEmail,
    patchUser,
    patchCompany,
    patchLogo,
    deleteUser,
    createRecoverPasswordCode,
    recoverPassword,
    patchInviteUser,
    patchAcceptInviteUser,
    patchRejectInviteUser
};