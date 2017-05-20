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
  connection.query(`select home.home_id,home.home_draw + away.away_draw as Draws
from  (SELECT club.name as home_id, IFNULL(home_draw , 0) as home_draw FROM
(select club.name as home_id , COUNT(fixture.home_id) as home_draw
         from fixture,result,club
  where fixture.id = result.fixture_id
         and club.id = fixture.home_id
         AND result.home_score = result.away_score
        GROUP by club.id
  order by home_draw DESC) home RIGHT JOIN club ON club.name = home.home_id

  GROUP By club.name
  ORDER BY home_draw DESC) home ,

     (SELECT club.name as away_id, IFNULL(away_draw, 0) as away_draw FROM
(select club.name as home_id , COUNT(fixture.away_id) as away_draw
         from fixture,result,club
  where fixture.id = result.fixture_id
         and club.id = fixture.away_id
         AND result.away_score = result.home_score
        GROUP by club.id
  order by away_draw DESC) home RIGHT JOIN club ON club.name = home.home_id

  GROUP By club.name
  ORDER BY away_draw DESC) away
where home.home_id = away.away_id
ORDER BY Draws DESC
LIMIT 1000`, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/wins', (req, res) => {
  connection.query(`select home.home_id,home.home_win + away.away_win as Wins
from  (SELECT club.name as home_id, IFNULL(home_win , 0) as home_win FROM
(select club.name as home_id , COUNT(fixture.home_id) as home_win
         from fixture,result,club
  where fixture.id = result.fixture_id
         and club.id = fixture.home_id
         AND result.home_score > result.away_score
        GROUP by club.id
  order by home_win DESC) home RIGHT JOIN club ON club.name = home.home_id

  GROUP By club.name
  ORDER BY home_win DESC) home ,

     (SELECT club.name as away_id, IFNULL(away_win, 0) as away_win FROM
(select club.name as home_id , COUNT(fixture.away_id) as away_win
         from fixture,result,club
  where fixture.id = result.fixture_id
         and club.id = fixture.away_id
         AND result.away_score > result.home_score
        GROUP by club.id
  order by away_win DESC) home RIGHT JOIN club ON club.name = home.home_id

  GROUP By club.name
  ORDER BY away_win DESC) away
where home.home_id = away.away_id
ORDER BY Wins DESC
LIMIT 1000`, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/loses', (req, res) => {
  connection.query(`select home.home_id,home.home_lost + away.away_lost as Losses
from  (SELECT club.name as home_id, IFNULL(home_lost , 0) as home_lost FROM
(select club.name as home_id , COUNT(fixture.home_id) as home_lost
         from fixture,result,club
  where fixture.id = result.fixture_id
         and club.id = fixture.home_id
         AND result.home_score < result.away_score
        GROUP by club.id
  order by home_lost DESC) home RIGHT JOIN club ON club.name = home.home_id

  GROUP By club.name
  ORDER BY home_lost DESC) home ,

     (SELECT club.name as away_id, IFNULL(away_lost, 0) as away_lost FROM
(select club.name as home_id , COUNT(fixture.away_id) as away_lost
         from fixture,result,club
  where fixture.id = result.fixture_id
         and club.id = fixture.away_id
         AND result.away_score < result.home_score
        GROUP by club.id
  order by away_lost DESC) home RIGHT JOIN club ON club.name = home.home_id

  GROUP By club.name
  ORDER BY away_lost DESC) away
where home.home_id = away.away_id
ORDER BY Losses DESC
LIMIT 1000`, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/points', (req, res) => {
  connection.query(`
SELECT win.id as 'clubId' , win.home as 'clubName', win.Wins as 'win' , draw.Draws as 'draw' , loss.losses as 'loss' , (win.Wins * 3)+draw.Draws as 'point'
from
(select home.home_id as home ,home.home_draw + away.away_draw as Draws
from (SELECT club.name as home_id, IFNULL(home_draw , 0) as home_draw FROM
(select club.name as home_id , COUNT(fixture.home_id) as home_draw
from fixture,result,club
where fixture.id = result.fixture_id
and club.id = fixture.home_id
AND result.home_score = result.away_score
GROUP by club.id
order by home_draw DESC) home RIGHT JOIN club ON club.name = home.home_id

GROUP By club.name
ORDER BY home_draw DESC) home ,

(SELECT club.name as away_id, IFNULL(away_draw, 0) as away_draw FROM
(select club.name as home_id , COUNT(fixture.away_id) as away_draw
from fixture,result,club
where fixture.id = result.fixture_id
and club.id = fixture.away_id
AND result.away_score = result.home_score
GROUP by club.id
order by away_draw DESC) home RIGHT JOIN club ON club.name = home.home_id

GROUP By club.name
ORDER BY away_draw DESC) away
where home.home_id = away.away_id
ORDER BY Draws DESC) draw ,

(select home.id , home.home_id as home,home.home_win + away.away_win as Wins
from (SELECT club.id as id , club.name as home_id, IFNULL(home_win , 0) as home_win FROM
(select club.name as home_id , COUNT(fixture.home_id) as home_win
from fixture,result,club
where fixture.id = result.fixture_id
and club.id = fixture.home_id
AND result.home_score > result.away_score
GROUP by club.id
order by home_win DESC) home RIGHT JOIN club ON club.name = home.home_id

GROUP By club.name
ORDER BY home_win DESC) home ,

(SELECT home.home_id as home , club.name as away_id, IFNULL(away_win, 0) as away_win FROM
(select club.name as home_id , COUNT(fixture.away_id) as away_win
from fixture,result,club
where fixture.id = result.fixture_id
and club.id = fixture.away_id
AND result.away_score > result.home_score
GROUP by club.id
order by away_win DESC) home RIGHT JOIN club ON club.name = home.home_id

GROUP By club.name
ORDER BY away_win DESC) away
where home.home_id = away.away_id
ORDER BY Wins DESC) win ,

(select home.home_id as home,home.home_lost + away.away_lost as Losses
from (SELECT club.name as home_id, IFNULL(home_lost , 0) as home_lost FROM
(select club.name as home_id , COUNT(fixture.home_id) as home_lost
from fixture,result,club
where fixture.id = result.fixture_id
and club.id = fixture.home_id
AND result.home_score < result.away_score
GROUP by club.id
order by home_lost DESC) home RIGHT JOIN club ON club.name = home.home_id

GROUP By club.name
ORDER BY home_lost DESC) home ,

(SELECT club.name as away_id, IFNULL(away_lost, 0) as away_lost FROM
(select club.name as home_id , COUNT(fixture.away_id) as away_lost
from fixture,result,club
where fixture.id = result.fixture_id
and club.id = fixture.away_id
AND result.away_score < result.home_score
GROUP by club.id
order by away_lost DESC) home RIGHT JOIN club ON club.name = home.home_id

GROUP By club.name
ORDER BY away_lost DESC) away
where home.home_id = away.away_id
ORDER BY Losses DESC) loss

where win.home = loss.home and win.home = draw.home and loss.home = draw.home

ORDER BY point DESC
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

app.listen(port, () => console.log(`Server is running at http://${host}:${port}`))
