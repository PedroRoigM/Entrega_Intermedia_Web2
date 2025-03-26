const { handleHttpError } = require("../utils/handleError")
const { verifyToken } = require("../utils/handleJwt")
const { userModel } = require("../models")

const authMiddleware = async (req, res, next) => {
    try {
        if (!req.headers.authorization) {
            handleHttpError(res, "NOT_TOKEN", 401)
            return
        }

        const token = req.headers.authorization.split(" ").pop()
        const dataToken = await verifyToken(token)
        if (!dataToken || !dataToken._id) {
            handleHttpError(res, "ERROR_ID_TOKEN", 401)
            return
        }
        const user = await userModel.findById(dataToken._id)

        if (!user) {
            handleHttpError(res, "USER_NOT_FOUND", 404)
            return
        }
        if (req.url !== 'verify') {
            if (!user.validated) {
                handleHttpError(res, "EMAIL_NOT_VALIDATED", 401)
                return
            }
        }
        req.user = user
        next()
    } catch (err) {
        console.log(err)
        handleHttpError(res, "NOT_SESSION", 401)
    }
}

module.exports = authMiddleware 