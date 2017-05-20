const express = require('express')
const mysql = require('mysql')
const cors = require('cors')
const morgan = require('morgan')
const bodyParser = require('body-parser')

const { host, user, password, database, port } = require('./config')
const { makeAnSQLStatement, isQueryHaveAPageAndLimit, applyLimitAndOffset } = require('./libs')

const app = express()
const logger = morgan('dev')

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())
app.use(logger)

const connection = mysql.createConnection({ host, user, password, database })

connection.connect()

app.get('/clubs', (req, res) => {
  const sql = makeAnSQLStatement(req.query, 'club')
  console.log(sql)
  connection.query(sql, function (err, rows, fields) {
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

app.delete('/clubs/:id', (req, res) => {
  connection.query('DELETE * from club where id =' + req.params.id, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/players/:id', (req, res) => {
  connection.query(`
    SELECT
      player.id AS id,
      player.number AS number,
      player.name AS name,
      player.position AS position,
      player.nationality AS nationality,
      player.dob AS dob,
      player.height AS height,
      player.weight AS weight,
      club.name AS 'clubName',
      club.id AS 'clubId'
    FROM
      player
    INNER JOIN
      club ON player.club_id = club.id
    WHERE
      player.id = ${req.params.id}
    `, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.delete('/players/:id', (req, res) => {
  connection.query('DELETE * from player where id =' + req.params.id, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/managers', (req, res) => {
  const sql = makeAnSQLStatement(req.query, 'manager')
  console.log(sql)
  connection.query(sql, function (err, rows, fields) {
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

app.delete('/managers/:id', (req, res) => {
  connection.query('DELETE * from manager where id =' + req.params.id, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/fixtures', (req, res) => {
  let sql = `
    SELECT
      f.id as id, f.date as date, f.home_id as homeId, f.away_id as awayId, home_club.name as homeName, away_club.name as awayName
    FROM
      fixture f
    INNER JOIN
      club AS home_club ON home_club.id = f.home_id
    INNER JOIN
      club As away_club ON away_club.id = f.away_id
  `
  sql = isQueryHaveAPageAndLimit(req.query)
    ? sql += applyLimitAndOffset(req.query)
    : sql
  console.log(sql)
  connection.query(sql, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/fixtures/:id', (req, res) => {
  connection.query('SELECT * from fixture where id=' + req.params.id, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.delete('/fixtures/:id', (req, res) => {
  connection.query('DELETE * from fixture where id=' + req.params.id, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/players', (req, res) => {
  const sql = makeAnSQLStatement(req.query, 'player')
  console.log(sql)
  connection.query(sql, (err, players) => {
    if (err) return res.json({ message: err.stack })
    res.json(players)
  })
})

app.get('/results', (req, res) => {
  let sql = `
    SELECT f.id AS 'fixtureId' , f.date AS date , h.id as 'homeId', h.name AS homeName , a.name AS awayName, a.id as 'awayId', r.home_score AS 'homeGoal' , r.away_score AS 'awayGoal'
    FROM fixture f INNER JOIN  result r ON f.id = r.fixture_id , (SELECT name, id FROM club) h, (SELECT name, id FROM club) a
    WHERE f.home_id = h.id AND f.away_id = a.id
    ORDER BY f.id DESC
  `
  sql = isQueryHaveAPageAndLimit(req.query)
    ? sql += applyLimitAndOffset(req.query)
    : sql
  connection.query(sql, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/datekickoff', (req, res) => {
  connection.query(`select f.id, date(f.date) as DATE ,time(f.date) as 'KICK OFF', h.name as HOME , a.name as AWAY
from result inner join fixture f on result.fixture_id = f.id ,(select name,id from club) h,(select name,id from club) a
where  f.home_id = h.id and f.away_id = a.id
ORDER BY f.id`, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/goals', (req, res) => {
  connection.query(`select home.home_id,home.homeSCORED + away.awaySCORED as SCORED
from  (select club.name as home_id , SUM(h.home_score) as homeSCORED
         from fixture,(select fixture_id , home_score from result) h,club
  where fixture.id = h.fixture_id and club.id = fixture.home_id
        GROUP by club.id
  order by homeSCORED DESC) home ,

     (select club.name as away_id , SUM(a.away_score) as awaySCORED
  from fixture,(select fixture_id , away_score from result) a,club
  where fixture.id = a.fixture_id and club.id = fixture.away_id
        GROUP by club.id
  order by awaySCORED DESC) away

where home.home_id = away.away_id
limit 1000`, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/goalsconcede', (req, res) => {
  connection.query(`select home.home_id,home.homeSCORED + away.awaySCORED as SCORED
from  (select club.name as home_id , SUM(h.home_score) as homeSCORED
         from fixture,(select fixture_id , home_score from result) h,club
  where fixture.id = h.fixture_id and club.id = fixture.away_id
        GROUP by club.id
  order by homeSCORED DESC) home ,

     (select club.name as away_id , SUM(a.away_score) as awaySCORED
  from fixture,(select fixture_id , away_score from result) a,club
  where fixture.id = a.fixture_id and club.id = fixture.home_id
        GROUP by club.id
  order by awaySCORED DESC) away

where home.home_id = away.away_id
limit 1000`, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/goalsdiff', (req, res) => {
  connection.query(`select allGoal.name , allGoal.SCORED - allGoalConcede.SCORED as DIFFERENT

from (select home.home_id as name,home.homeSCORED + away.awaySCORED as SCORED
from  (select club.name as home_id , SUM(h.home_score) as homeSCORED
         from fixture,(select fixture_id , home_score from result) h,club
  where fixture.id = h.fixture_id and club.id = fixture.home_id
        GROUP by club.id
  order by homeSCORED DESC) home ,

     (select club.name as away_id , SUM(a.away_score) as awaySCORED
  from fixture,(select fixture_id , away_score from result) a,club
  where fixture.id = a.fixture_id and club.id = fixture.away_id
        GROUP by club.id
  order by awaySCORED DESC) away

where home.home_id = away.away_id) allGoal ,

(select home.home_id as name ,home.homeSCORED + away.awaySCORED as SCORED
from  (select club.name as home_id , SUM(h.home_score) as homeSCORED
         from fixture,(select fixture_id , home_score from result) h,club
  where fixture.id = h.fixture_id and club.id = fixture.away_id
        GROUP by club.id
  order by homeSCORED DESC) home ,

     (select club.name as away_id , SUM(a.away_score) as awaySCORED
  from fixture,(select fixture_id , away_score from result) a,club
  where fixture.id = a.fixture_id and club.id = fixture.home_id
        GROUP by club.id
  order by awaySCORED DESC) away

where home.home_id = away.away_id) allGoalConcede

where allGoal.name = allGoalConcede.name

order by DIFFERENT DESC`, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/draws', (req, res) => {
  connection.query(`
    SELECT club.name AS club , COUNT(fixture.home_id) AS draws
    FROM fixture,result,club
    WHERE (fixture.id = result.fixture_id AND club.id = fixture.home_id AND result.home_score = result.away_score)
    OR (fixture.id = result.fixture_id AND club.id = fixture.away_id AND result.home_score = result.away_score)
    GROUP BY club.id
    ORDER BY draws DESC`, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/wins', (req, res) => {
  connection.query(`
    SELECT club.name AS club , COUNT(fixture.home_id) AS wins
    FROM fixture,result,club
    WHERE (fixture.id = result.fixture_id AND club.id = fixture.home_id AND result.home_score > result.away_score)
    OR (fixture.id = result.fixture_id AND club.id = fixture.away_id AND result.home_score < result.away_score)
    GROUP BY club.id
    ORDER BY wins DESC`, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/loses', (req, res) => {
  connection.query(`
    SELECT club.name AS club , COUNT(fixture.home_id) AS losses
    FROM fixture,result,club
    WHERE (fixture.id = result.fixture_id AND club.id = fixture.home_id AND result.home_score < result.away_score)
    OR (fixture.id = result.fixture_id AND club.id = fixture.away_id AND result.home_score > result.away_score)
    GROUP BY club.id
    ORDER BY losses DESC`, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/points', (req, res) => {
  connection.query(`
    SELECT win.club as clubs, win.wins , draw.draws , loss.losses , (win.wins * 3) + draw.draws as points
    FROM (SELECT club.name AS club , COUNT(fixture.home_id) AS draws
    FROM fixture,result,club
    WHERE (fixture.id = result.fixture_id AND club.id = fixture.home_id AND result.home_score = result.away_score)
    OR (fixture.id = result.fixture_id AND club.id = fixture.away_id AND result.home_score = result.away_score)
    GROUP BY club.id
    ORDER BY draws DESC) draw ,

    (SELECT club.name AS club , COUNT(fixture.home_id) AS wins
    FROM fixture,result,club
    WHERE (fixture.id = result.fixture_id AND club.id = fixture.home_id AND result.home_score > result.away_score)
    OR (fixture.id = result.fixture_id AND club.id = fixture.away_id AND result.home_score < result.away_score)
    GROUP BY club.id
    ORDER BY wins DESC) win ,

    (SELECT club.name AS club , COUNT(fixture.home_id) AS losses
    FROM fixture,result,club
    WHERE (fixture.id = result.fixture_id AND club.id = fixture.home_id AND result.home_score < result.away_score)
    OR (fixture.id = result.fixture_id AND club.id = fixture.away_id AND result.home_score > result.away_score)
    GROUP BY club.id
    ORDER BY losses DESC) loss

    WHERE win.club = loss.club and win.club = draw.club and loss.club = draw.club
    ORDER by points DESC
    LIMIT 1000
`, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/referees', (req, res) => {
  const sql = makeAnSQLStatement(req.query, 'referee')
  console.log(sql)
  connection.query(sql, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.post('/clubs', function (req, res) {
  //console.log('dsds', req.body.name);
  var query = `
    insert into club values(${req.body.id},'${req.body.name}','${req.body.stadium_name}','${req.body.official_site}',${req.body.manager_id})`;
  connection.query(query,function(err,rows,fields){
    if (err) throw err
    res.json(rows)
  })
})

app.listen(port, () => console.log(`Server is running at http://${host}:${port}`))
