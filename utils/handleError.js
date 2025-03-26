const handleHttpError = (res, message, code = 403) => {
    // Si el mensaje es un objeto, enviamos el objeto completo
    if (typeof message === 'object' && message !== null) {
        return res.status(code).send(message);
    }

    // Si es un string, enviamos un objeto con el mensaje
    res.status(code).send({ error: message });
};

const createError = (message, status = 500) => {
    return {
        status,
        message
    };
};

module.exports = {
    handleHttpError,
    createError
};
