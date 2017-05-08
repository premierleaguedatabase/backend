const express = require("express")
const mysql = require('mysql')

const app = express()

const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'HjiMV4Z6aM:J',
  database : 'epl'
});

app.get('/clubs', (req, res) => {
  connection.connect()
  connection.query('SELECT * from club', function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
  connection.end()
})

app.get('/clubs/:id', (req, res) => {
  connection.connect()
  connection.query('SELECT * from club where id =' + req.params.id, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
  connection.end()
})

// app.get('/players', (req, res) => {
//   const sql = 'SELECT * from player'
//   if (req.query) {
//     sql.concat(' WHERE ')
//     for (var key in req.query) {
//       sql.concat(key + ' = ' + req.query[key])
//     }
//   }
//   console.log(sql)
//   connection.connect()
//   connection.query('SELECT * from player', function (err, rows, fields) {
//     if (err) throw err
//     res.json(rows)
//   })
//   connection.end()
// })

app.get('/players:id', (req, res) => {
  connection.connect()
  connection.query('SELECT * from player where id =' + req.params.id, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
  connection.end()
})

app.get('/managers', (req, res) => {
  connection.connect()
  connection.query('SELECT * from manager', function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
  connection.end()
})

app.get('/managers/:id', (req, res) => {
  connection.connect()
  connection.query('SELECT * from manager where id =' + req.params.id, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
  connection.end()
})

app.get('/fixtures', (req, res) => {
  connection.connect()
  connection.query('SELECT * from fixture', function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
  connection.end()
})

app.get('/fixtures:id', (req, res) => {
  connection.connect()
  connection.query('SELECT * from fixture where id=' + req.params.id, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
  connection.end()
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
  connection.connect()
  connection.query(sql, (err, clubs) => { 
    console.log(sql) 
    if(err) return res.json({ message: err.stack }) 
    const result = { clubs, page: 1, size: clubs.length } 
    res.json(result) 
  }) 
})

app.listen(8000, () => console.log('Server is running at http://localhost:8000'))
