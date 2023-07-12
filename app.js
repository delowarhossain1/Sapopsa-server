const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors');
const fileUpload = require('express-fileupload');

const app = express();

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));
app.use(cors());
app.use(fileUpload());
app.use('/api/images', express.static('uploades'));



module.exports = app;