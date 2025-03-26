const { userModel } = require('../models/user.model')
const { encrypt, compare } = require('../utils/handlePassword')
const { tokenSign } = require('../utils/handleJwt')
const { updateToPinata } = require('../utils/UploadToPinata')
const pinata_gateway_url = process.env.PINATA_GATEWAY_URL
const { createError } = require('../utils/handleError')
const user = require('../models/nosql/user')

/*
    * Genera un código de verificación de 4 dígitos y lo devuelve junto con la fecha de expiración
    * @returns {Object} - Código de verificación y fecha de expiración
*/
const generateVerificationCode = () => {
    const code = (Math.floor(Math.random() * (9999 - 1000) + 1000)).toString()
    // El código expirará en 5 minutos
    const expiresAt = new Date(Date.now + 5 * 60000)
    return { code, expiresAt }
};

/*
    * Obtiene los datos de un usuario por su ID
    * @param {String} userId - ID del usuario
    * @returns {Promise<Object>} - Datos del usuario
*/
const getUserById = async (userId) => {
    try {
        const user = await userModel.findById(userId)
        if (!user) {
            throw createError('USER_NOT_EXISTS', 404)
        }
        return user
    } catch (err) {
        throw createError('ERROR_GET_USER', 500)
    }
};

/*
    * Registra un nuevo usuario o actualizar uno existente no válidado
    * @param {Object} userData - Datos del usuario a registrar
    * @returns {Promise<Object>} - Datos del usuario registrado y token
*/
const register = async (userData) => {
    try {
        const password = await encrypt(userData.password)

        // Generamos un código de verificación
        const { code, expiresAt } = generateVerificationCode()

        // Creamos un objeto con los datos del usuario
        const body = {
            ...userData, password,
            accountStatus: {
                validated: false,
                active: true,
                verificationCode: code,
                codeExpiration: expiresAt
            }
        };

        // Verificamos si el email ya existe
        const existingUser = await userModel.findOne({ email: userData.email })
        let dataUser;

        if (existingUser) {
            if (existingUser.accountStatus.validated) {
                throw createError('EMAIL_ALREADY_EXISTS', 409)
            }

            // Actualizamos los datos del usuario al no estar validado
            dataUser = await userModel.findOneAndUpdate(
                { email: userData.email },
                {
                    body,
                },
                { new: true }
            )
        } else {
            // Creamos un nuevo usuario en la base de datos
            dataUser = await userModel.create(body)
        }

        if (dataUser) {
            // Eliminamos la contraseña del objeto a devolver
            dataUser.set("password", undefined, { strict: false })
        }

        return {
            token: tokenSign(dataUser),
            user: dataUser
        }
    } catch (error) {
        throw createError('ERROR_REGISTER_USER', 500)
    }
}

/*
    * Verifica el email de un usuario
    * @param {string} email - Email del usuario
    * @param {string} code - Código de verificación
    * @returns {Promise<Object>} - Mensaje de éxito
*/
const verifyEmail = async (email, code) => {
    try {
        const user = await userModel.findOne({ email }) // Buscamos el usuario por su email
        if (!user) {
            throw createError('USER_NOT_EXISTS', 404)
        }
        if (user.accountStatus.validated) {
            throw createError('EMAIL_ALREADY_VALIDATED', 400)
        }

        // Verificar que el código es aún valido y es correcto
        if (!user.isVerificationCodeValid() || user.accountStatus.verificationCode !== code) {
            throw createError('INVALID_OR_EXPIRED_CODE', 400)
        }

        // Actualizar estado del usuario
        user.accountStatus.validated = true
        user.accountStatus.verificationCode = undefined
        user.accountStatus.codeExpiration = undefined
        await user.save()

        return { message: "EMAIL_VALIDATED" }
    } catch (error) {
        throw createError('ERROR_VALIDATING_EMAIL', 500)
    }
}

/*
    * Inicia sesión de un usuario
    * @param {string} email - Email del usuario
    * @param {string} password - Contraseña del usuario
    * @returns {Promise<Object>} - Datos del usuario y token
*/
const login = async (email, password) => {
    try {
        // Buscamos el usuario por su email
        const user = await userModel.findOne({ email }).select('+password') // Seleccionar la contraseña explícitamente
        if (!user) {
            throw createError('USER_NOT_EXISTS', 404);
        }

        // Verificar si la cuenta está verificada
        if (!user.accountStatus.validated) {
            throw createError("EMAIL_NOT_VALIDATED", 401);
        }

        // Comprobar el número de intentos de inicio de sesión
        if (user.accountStatus.loginAttempts >= 5) {
            // Verificar si ha caducado ya el tiempo bloqueado
            const thirtyMinutes = new Date(Date.now() - 30 * 60 * 1000);
            if (user.accountStatus.lastLoginAttempt > thirtyMinutes) {
                throw createError("TOO_MANY_ATTEMPTS", 429)
            } else {
                user.accountStatus.loginAttempts = 0
            }
        }

        // Actualizar el último intento de inicio de sesión
        user.accountStatus.lastLoginAttempt = new Date();

        // Comprobar la contraseña
        const isValidPassword = await compare(password, user.password)
        if (!isValidPassword) {
            user.accountStatus.loginAttempts += 1
            await user.save()
            throw createError("INVALID_PASSWORD", 401)
        }

        // Reiniciar el contador de intentos de inicio de sesión
        user.accountStatus.loginAttempts = 0
        await user.save()

        // Eliminar la contraseña del objeto a devolver
        user.set("password", undefined, { strict: false })

        return {
            token: tokenSign(user),
            user
        }
    } catch (error) {
        throw createError('ERROR_LOGIN_USER', 500)
    }
}

/*
    * Actualiza los datos básicos de un usuario
    * @param {string} userId - ID del usuario
    * @param {Object} userData - Datos del usuario a actualizar
    * @returns {Promise<Object>} - Datos del usuario actualizado
*/
const updateUser = async (userId, userData) => {
    try {
        // Filtrar campos que no se pueden actualizar
        const { password, accountStatus, ...data } = userData

        const user = await userModel.findByIdAndUpdate(userId,
            { $set: data },
            { new: true }
        );
        return user;
    } catch (error) {
        throw createError('ERROR_UPDATE_USER', 500)
    }
}
/**
 * Actualiza los datos de la empresa de un usuario
 * @param {string} userId - ID del usuario
 * @param {Object} companyData - Datos de la empresa
 * @returns {Promise<Object>} Datos actualizados del usuario
 */
const updateCompany = async (userId, companyData) => {
    try {
        let updateQuery = {};

        // Prerparar la actualización de los datos de la empresa
        for (const [key, value] of Object.entries(otherCompanyData)) {
            updateQuery[`company.${key}`] = value;
        }

        // Actualizar los datos de la empresa
        if (address) {
            for (const [key, value] of Object.entries(address)) {
                updateQuery[`company.address.${key}`] = value;
            }
        }

        const user = await userModel.findByIdAndUpdate(userId,
            { $set: updateQuery },
            { new: true }
        );
        return user;
    } catch (error) {
        throw createError('ERROR_UPDATE_COMPANY', 500)
    }
}
/**
 * Elimina un usuario (soft delete o hard delete)
 * @param {string} userId - ID del usuario
 * @param {boolean} soft - Si es true, se hace soft delete
 * @returns {Promise<Object>} Mensaje de confirmación
 */
const deleteUser = async (userId, soft = true) => {
    try {
        if (soft) {
            await userModel.softDelete({ _id: userId });
        } else {
            await userModel.deleteOne({ _id: userId });
        }
        return { message: "USER_DELETED" };
    } catch (error) {
        throw createError('ERROR_DELETE_USER', 500)
    }
}

/**
 * Crea un código para recuperar contraseña
 * @param {string} email - Email del usuario
 * @returns {Promise<Object>} Mensaje de confirmación
 */
const createRecoverCode = async (email) => {
    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            throw createError('USER_NOT_EXISTS', 404);
        }

        // Generar un código de recuperación
        const { code, expiresAt } = generateVerificationCode();

        // Actualizar los datos del usuario
        user.accountStatus.passwordResetCode = code;
        user.accountStatus.passwordResetExpiration = expiresAt;
        await user.save();

        return {
            message: "RECOVER_CODE_CREATED",
            expiresAt
        };
    } catch (error) {
        throw createError('ERROR_CREATE_RECOVER_CODE', 500)
    }
}

/**
 * Recupera la contraseña de un usuario
 * @param {string} email - Email del usuario
 * @param {string} code - Código de verificación
 * @param {string} password - Nueva contraseña
 * @returns {Promise<Object>} Mensaje de confirmación
 */
const recoverPassword = async (email, code, password) => {
    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            throw createError('USER_NOT_EXISTS', 404);
        }

        // Verificar que el código es aún valido y es correcto
        if (!user.isPasswordResetCodeValid() || user.accountStatus.passwordResetCode !== code) {
            throw createError('INVALID_OR_EXPIRED_CODE', 400);
        }

        // Actualizar la contraseña
        user.password = await encrypt(password);
        user.accountStatus.passwordResetCode = undefined;
        user.accountStatus.passwordResetExpiration = undefined;
        await user.save();

        return { message: "PASSWORD_UPDATED" };
    } catch (error) {
        throw createError('ERROR_RECOVER_PASSWORD', 500)
    }
}

/**
 * Invita a un usuario
 * @param {Object} currentUser - Usuario que invita
 * @param {string} email - Email del usuario invitado
 * @returns {Promise<Object>} Datos actualizados del usuario
 */
const inviteUser = async (currentUser, email) => {
    try {
        const invited = await userModel.findOne({ email });
        if (!invited) {
            throw createError('USER_NOT_EXISTS', 404);
        }
        // Crear una invitación
        const invitation = {
            userId: currentUser._id,
            email: currentUser.email,
            status: 'pending',
        };
        // Añadir la invitación a las recibidas por el usuario invitado
        await user.findByIdAndUpdate(invited._id, {
            $push: { invitations: invitation }
        },
            { new: true });

        // Añadir la invitación a las enviadas por el usuario actual
        const invitationForSender = {
            ...invitation
        }

        await user.findByIdAndUpdate(currentUser._id, {
            $push: { sentInvitations: invitationForSender }
        },
            { new: true });
        return { message: "USER_INVITED" };
    } catch (error) {
        throw createError('ERROR_INVITE_USER', 500)
    }
}

/**
 * Acepta una invitación
 * @param {Object} currentUser - Usuario que acepta la invitación
 * @param {string} inviterId - ID del usuario que envió la invitación
 * @returns {Promise<Object>} Datos actualizados del usuario
 */
const acceptInvitation = async (currentUser, inviterId) => {
    try {
        // Buscar la invitación en las recibidas
        const invitation = currentUser.invitations.find(
            inv => inv.userId.toString() === inviterId
        );
        if (!invitation) {
            throw createError('INVITATION_NOT_EXISTS', 404);
        }

        // Eliminar la invitación del usuario actual
        await userModel.findByIdAndUpdate(currentUser._id, {
            $pull: { invitations: { userId: inviterId } }
        });

        // Introducir al usuario en la lista de la compañia y eliminar la invitación
        await userModel.findByIdAndUpdate(currentUser._id, {
            $push: {
                company: {
                    partners: {
                        _id: inviterId,
                        role: invitation.role
                    }
                }
            },
            $pull: {
                invitations: { userId: inviterId }
            }
        });

        return { message: "INVITATION_ACCEPTED" };
    }
    catch (error) {
        throw createError('ERROR_ACCEPT_INVITATION', 500)
    }
}

/*
* Rechaza una invitación
* @param {Object} currentUser - Usuario que rechaza la invitación
* @param {string} inviterId - ID del usuario que envió la invitación
* @returns {Promise<Object>} Datos actualizados del usuario
*/
const rejectInvitation = async (currentUser, inviterId) => {
    try {
        // Buscar la invitación en las recibidas por el usuario
        const invitation = currentUser.receivedInvitations.find(
            inv => inv.userId.toString() === inviterId
        );

        if (!invitation) {
            throw createError("INVITATION_NOT_FOUND", 404);
        }

        // Actualizar estado de la invitación en el usuario actual
        await userModel.findByIdAndUpdate(
            currentUser._id,
            {
                $set: {
                    "receivedInvitations.$[elem].status": "rejected"
                }
            },
            {
                arrayFilters: [{ "elem.userId": inviterId }],
                new: true
            }
        );

        // Actualizar estado de la invitación en el usuario que invitó
        const updatedInviter = await userModel.findByIdAndUpdate(
            inviterId,
            {
                $set: {
                    "sentInvitations.$[elem].status": "rejected"
                }
            },
            {
                arrayFilters: [{ "elem.userId": currentUser._id }],
                new: true
            }
        );

        return updatedInviter;
    } catch (error) {
        if (error.status) {
            throw error;
        }
        throw createError(`Error al rechazar invitación: ${error.message}`, 500);
    }
};

module.exports = {
    getUserById,
    register,
    verifyEmail,
    login,
    updateUser,
    updateCompany,
    deleteUser,
    createRecoverCode,
    recoverPassword,
    inviteUser,
    acceptInvitation,
    rejectInvitation
}