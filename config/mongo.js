const mongoose = require('mongoose')
const config = require('../config')
const dbConnect = () => {
    mongoose.set('strictQuery', false)
    try {
        mongoose.connect(config.db_uri)
    } catch (error) {
        console.error("Error conectando a la BD:", error)
    }
    //Listen events
    mongoose.connection.on("connected", () => console.log("Conectado a la BD"))
}
module.exports = dbConnect
