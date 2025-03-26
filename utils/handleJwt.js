const jwt = require('jsonwebtoken')
const config = require('../config')
const jwt_secret = config.jwt_secret
const jwt_expiresIn = config.jwt_expiresIn
const tokenSign = (user) => {
    const sign = jwt.sign(
        {
            _id: user._id,
            role: user.role
        },
        jwt_secret,
        {
            expiresIn: jwt_expiresIn
        }
    )

    return sign
}

const verifyToken = (tokenJwt) => {
    try {
        return jwt.verify(tokenJwt, jwt_secret)
    } catch (err) {
        console.log(err)
    }
}

module.exports = { tokenSign, verifyToken }