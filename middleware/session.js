const { handleHttpError } = require("../utils/handleError")
const { verifyToken } = require("../utils/handleJwt")
const { userModel } = require("../models")

const authMiddleware = async (req, res, next) => {
    try {
        // Verificar que exista el token en los headers
        if (!req.headers.authorization) {
            handleHttpError(res, "NOT_TOKEN", 401)
            return
        }

        // Extraer el token (Bearer xxxx) - tomar solo la parte xxxx
        const token = req.headers.authorization.split(" ").pop()

        // Verificar que el token sea válido
        const dataToken = await verifyToken(token)
        if (!dataToken || !dataToken._id) {
            handleHttpError(res, "ERROR_ID_TOKEN", 401)
            return
        }

        // Buscar al usuario por ID
        const user = await userModel.findById(dataToken._id)
        if (!user) {
            handleHttpError(res, "USER_NOT_FOUND", 404)
            return
        }

        // Si la ruta no es 'verify', verificar que el usuario esté validado
        const bypassRoutes = ['/verify', '/recover'];
        const shouldCheckValidation = !bypassRoutes.some(route => req.url.includes(route));

        if (shouldCheckValidation) {
            // Comprobar si el usuario tiene la propiedad accountStatus o validated directamente
            const isValidated = user.accountStatus && typeof user.accountStatus.validated === 'boolean'
                ? user.accountStatus.validated
                : (typeof user.validated === 'boolean' ? user.validated : false);

            if (!isValidated) {
                handleHttpError(res, "EMAIL_NOT_VALIDATED", 401)
                return
            }
        }

        // Añadir el usuario a la solicitud para que esté disponible en los controladores
        req.user = user
        next()
    } catch (err) {
        console.log("Error en middleware de autenticación:", err)
        handleHttpError(res, "NOT_SESSION", 401)
    }
}

module.exports = authMiddleware