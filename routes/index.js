const express = require('express');
const fs = require('fs');
const router = express.Router();
const removeExtension = (fileName) => fileName.split('.').shift();

fs.readdirSync(__dirname).forEach(file => {
    const name = removeExtension(file);
    if (name !== 'index') {
        router.use(`/${name}`, require(`./${name}`));
        // imprimir el nombre de la ruta
        console.log(`Ruta: /${name}`);
    }
});
module.exports = router;