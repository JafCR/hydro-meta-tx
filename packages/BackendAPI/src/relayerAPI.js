const express = require('express')
const router = require('./routes.js')
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
// app.use(bodyParser.raw())

app.use(router)
app.listen(4000)
