const jwt = require('jsonwebtoken')
const config = require('../config')
const jwt_secret = config.jwt_secret
const jwt_expiresIn = config.jwt_expiresIn

/**
 * Genera un token JWT para un usuario
 * @param {Object} user - Datos del usuario para incluir en el token
 * @returns {string} - Token JWT generado
 */
const tokenSign = (user) => {
    try {
        const sign = jwt.sign(
            {
                _id: user._id,
                role: user.role || 'user'
            },
            jwt_secret,
            {
                expiresIn: jwt_expiresIn
            }
        )
        return sign
    } catch (error) {
        console.error("Error al generar token:", error);
        return null;
    }
}

/**
 * Verifica y decodifica un token JWT
 * @param {string} tokenJwt - Token JWT a verificar
 * @returns {Object|null} - Datos decodificados del token o null si no es válido
 */
const verifyToken = (tokenJwt) => {
    try {
        return jwt.verify(tokenJwt, jwt_secret)
    } catch (err) {
        console.log("Error al verificar token:", err)
        return null;
    }
}

module.exports = { tokenSign, verifyToken }