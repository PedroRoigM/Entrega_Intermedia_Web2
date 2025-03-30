/**
 * Crea un objeto de error con el mensaje y código de estado especificados
 * @param {string} message - Mensaje de error
 * @param {number} status - Código de estado HTTP
 * @returns {Object} - Objeto de error
 */
const createError = (message, status = 500) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

/**
 * Maneja errores HTTP enviando respuesta con código y mensaje adecuados
 * @param {Object} res - Objeto de respuesta Express
 * @param {string|Object|Error} message - Mensaje de error o error completo
 * @param {number} code - Código de estado HTTP (por defecto 403)
 */
const handleHttpError = (res, message, code = 403) => {
    // Si recibimos un objeto Error con propiedad status, usamos ese código
    if (message instanceof Error && message.status) {
        code = message.status;
        message = message.message;
    }

    // Si el mensaje es un objeto con propiedad status, usamos ese código
    if (typeof message === 'object' && message !== null && message.status) {
        code = message.status;
        message = message.message || message;
    }

    // Si el mensaje es un objeto, enviamos el objeto completo
    if (typeof message === 'object' && message !== null && !message.message) {
        return res.status(code).send(message);
    }

    // Si es un string, enviamos un objeto con el mensaje
    res.status(code).send({ error: message });
};

module.exports = { handleHttpError, createError };