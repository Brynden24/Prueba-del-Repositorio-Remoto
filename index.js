const express = require('express');
const cors = require('cors')
const path = require('path')
const routerApi = require('./routes/index')
const config = require('./configuration/config')
const {options} = require('./cors/cors-data')
const {logErrors, boomErrorHandler, errorHandler} = require('./middlewares/error.handler')

const app = express();
const PORT = config.port;

app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(cors(options))

app.use(express.static(path.join(__dirname, 'src', 'public')))

routerApi(app)

app.use(logErrors)
app.use(boomErrorHandler)
app.use(errorHandler)

app.get('*', (req, res) => {


    res.sendFile(path.join(__dirname, 'src', 'public', 'index.html'));
  })

const server = app.listen(PORT, () => {
    console.log(`Mi port: ${PORT}`)
})

module.exports = {app, server};
