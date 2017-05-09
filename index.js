const express = require('express')
const mysql = require('mysql')
const cors = require('cors')
const morgan = require('morgan')
const bodyParser = require('body-parser')

const app = express()
const logger = morgan('dev')

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.use(cors())

const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '123456789',
  database : 'epl'
});

connection.connect()

app.get('/clubs', (req, res) => {
  connection.query('SELECT * from club', function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/clubs/:id', (req, res) => {
  connection.query('SELECT * from club where id =' + req.params.id, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})


app.get('/players/:id', (req, res) => {
  connection.query('SELECT * from player where id =' + req.params.id, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/managers', (req, res) => {
  connection.query('SELECT * from manager', function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/managers/:id', (req, res) => {
  connection.query('SELECT * from manager where id =' + req.params.id, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/fixtures', (req, res) => {
  connection.query('SELECT * from fixture', function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/fixtures:id', (req, res) => {
  connection.query('SELECT * from fixture where id=' + req.params.id, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

const applyWhere = (query, tableName) => {
  const isQueryExist = Object.keys(query).length === 0
  return isQueryExist ? `SELECT * FROM ${tableName}`: whereByAttrs(query, tableName) + `LIMIT 10`
}

const whereByAttrs = (query = {}, tableName = '') =>
  Object.keys(query)
    .reduce(
      (prev, key, index) => prev.concat(`${(index !== 0) ? 'AND' : ''} ${tableName}.${key} = ${!parseInt(query[key]) ? `"${query[key]}"` : query[key]}`),
      `SELECT * FROM ${tableName} WHERE `
    )

app.get('/players', (req, res) => {
  const sql = applyWhere(req.query, 'player')
  connection.query(sql, (err, players) => {
    console.log(sql)
    if(err) return res.json({ message: err.stack })
    const result = { players, page: 1, size: players.length }
    res.json(result)
  })
})

app.listen(3310, () => console.log('Server is running at http://localhost:3310'))
