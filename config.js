require("dotenv").config();

module.exports = {
    port: process.env.PORT || 3000,
    db_uri: process.env.DB_URI,
    jwt_secret: process.env.JWT_SECRET,
    jwt_expiresIn: process.env.JWT_EXPIRESIN || "2h"
}