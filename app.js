require("dotenv").config();
const morganBody = require("morgan-body")
const { IncomingWebhook } = require("@slack/webhook")
const loggerStream = require("./utils/handleLogger")
const config = require("./config");

const express = require('express');
const cors = require('cors');
const dbConnect = require('./config/mongo');

const app = express();
app.use(cors());
app.use(express.json());
const port = config.port || 3000;

app.use('/api', require("./routes"));
morganBody(app, {
    noColors: true, //limpiamos el String de datos lo máximo posible antes de mandarlo a Slack
    skip: function (req, res) { //Solo enviamos errores (4XX de cliente y 5XX de servidor)
        return res.statusCode >= 500
    },
    stream: loggerStream
})
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    dbConnect();
});