require("dotenv").config();
const morganBody = require("morgan-body")
const { IncomingWebhook } = require("@slack/webhook")
const loggerStream = require("./utils/handleLogger")
const config = require("./config");

const express = require('express');
const cors = require('cors');
const dbConnect = require('./config/mongo');

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./swagger.yaml');


const app = express();
app.use(cors());
app.use(express.json());
const port = config.port || 3000;
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api', require("./routes"));
morganBody(app, {
    noColors: true, //limpiamos el String de datos lo máximo posible antes de mandarlo a Slack
    skip: function (req, res) { //Solo enviamos errores 500 (errores del servidor)
        return res.statusCode < 500
    },
    stream: loggerStream
})
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    dbConnect();
});

module.exports = app;