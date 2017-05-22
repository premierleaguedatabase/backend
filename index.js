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

app.get('/events', (req, res) => {
  const sql = 'select * from event, extra where event.id = extra.event_id'
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
  connection.query('DELETE from player where id =' + req.params.id, function (err, rows, fields) {
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
  connection.query('DELETE from manager where id =' + req.params.id, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.delete('/clubs/:id', function (req, res) {
  var query = `delete from club where id = ${req.params.id}`;
  connection.query(query, function(err, rows, fields){
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
  connection.query('DELETE from fixture where id = ' + req.params.id, function (err, rows, fields) {
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
  connection.query(`
    select f.id, date(f.date) as DATE ,time(f.date) as 'KICK OFF', h.name as HOME , a.name as AWAY
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
    SELECT win.club as clubs, played.played, win.wins , draw.draws , loss.losses , (win.wins * 3) + draw.draws as points
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
    ORDER BY losses DESC) loss ,

    (SELECT club.name AS clubName, COUNT(club.id) AS played
    FROM fixture, result, club
    WHERE fixture.id = result.fixture_id
    AND (club.id = fixture.home_id OR club.id = fixture.away_id)
    GROUP BY club.id
    ORDER BY played DESC) played

    WHERE win.club = loss.club AND win.club = draw.club AND loss.club = draw.club AND played.clubName = win.club
    ORDER by points DESC
    LIMIT 1000`, function (err, rows, fields) {
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

app.post('/events', function (req, res) {
  //console.log('dsds', req.body.name);
  var query = `
    insert into event values(${req.body.id},${req.body.fixture_id},'${req.body.min}','${req.body.type}','${req.body.player_id}')`;
  connection.query(query,function(err,rows,fields){
    if (err) throw err
    res.json(rows)
  })
})

app.post('/clubs', (req, res) => {
  //console.log('dsds', req.body.name);
  var query = `
    insert into club values(${req.body.id},'${req.body.name}','${req.body.stadium_name}','${req.body.official_site}',${req.body.manager_id})`;
  connection.query(query,function(err, rows, fields){
    if (err) throw err
    res.json(rows)
  })
})

app.post('/players', (req, res) => {
  var query = `
    insert into player values(${req.body.id},${req.body.number},'${req.body.name}','${req.body.club_id}','${req.body.position}',
    '${req.body.nationality}','${req.body.dob}','${req.body.height}','${req.body.weight}')`;
  connection.query(query, function(err, rows, fields){
    if (err) throw err
    res.json(rows)
  })
})

app.post('/managers', (req, res) => {
  var query = `
    insert into manager values(${req.body.id},'${req.body.name}','${req.body.country_of_birth}','${req.body.dob}')`;
  connection.query(query, function(err, rows, fields){
    if (err) throw err
    res.json(rows)
  })
})

app.post('/fixtures', (req, res) => {
  var query = `
    insert into fixture values(${req.body.id},'${req.body.date}',${req.body.home_id},${req.body.away_id})`;
  connection.query(query, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.post('/results', (req, res) => {
  var query = `
    insert into result values(${req.body.fixture_id},'${req.body.referee_name}',${req.body.attendance},${req.body.home_score},${req.body.away_score})`;
  connection.query(query, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.put('/players', function (req, res) {
  // var query = 'UPDATE player SET number = '+req.body.number+', name = '+req.body.name+', club_id ='+req.body.club_id+'
  // , position = '+req.body.position+' , nationality = '+req.body.nationality+', dob = '+req.body.dob+'
  // , height = '+req.body.height+', weight = '+req.body.weight+' WHERE id = '+req.body.id;

  var query = `
    UPDATE player SET number = ${req.body.number}, name = '${req.body.name}',club_id = '${req.body.club_id}' , position = '${req.body.position}',
    nationality = '${req.body.nationality}',dob = '${req.body.dob}',height = '${req.body.height}',weight = '${req.body.weight}'
    WHERE id = ${req.body.id}`;
  connection.query(query, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})
app.put('/fixtures', function (req, res) {

  var query = `
    UPDATE fixture SET date = '${req.body.date}', home_id = ${req.body.home_id},away_id = ${req.body.away_id}
    WHERE id = ${req.body.id}`;
  connection.query(query, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.put('/managers', function (req, res) {

  var query = `
    UPDATE manager SET name = '${req.body.name}', country_of_birth = '${req.body.country_of_birth}',dob = '${req.body.dob}'
    WHERE id = ${req.body.id}`;
  connection.query(query, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.put('/clubs', function (req, res) {

  var query = `
    UPDATE club SET name = '${req.body.name}', stadium_name = '${req.body.stadium_name}',official_site = '${req.body.official_site}' , manager_id = ${req.body.manager_id}
    WHERE id = ${req.body.id}`;
  connection.query(query, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.put('/events', function (req, res) {
  var query = `
    UPDATE event SET fixture_id = '${req.body.fixture_id}', min = '${req.body.min}',type = '${req.body.type}' , player_id = ${req.body.player_id}
    WHERE id = ${req.body.id}`;
  connection.query(query, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.put('/results', function (req, res) {
  var query = `
    UPDATE result SET referee_name = '${req.body.referee_name}', attendance = '${req.body.attendance}',home_score = '${req.body.home_score}' , away_score = ${req.body.away_score}
    WHERE fixture_id = ${req.body.fixture_id}`;
  connection.query(query, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.put('/referees', function (req, res) {
  var query = `
    UPDATE referee SET name = '${req.body.name}', bio = '${req.body.bio}'
    WHERE id = ${req.body.id}`;
  connection.query(query, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.put('/extras', function (req, res) {
  var query = `
    UPDATE extra SET fixture_id = '${req.body.fixture_id}', player_id = '${req.body.player_id}'
    WHERE event_id = ${req.body.event_id}`;
  connection.query(query, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/players/:id/goals', (req, res) => {
  const sql = `SELECT event.player_id AS playerId, COUNT(event.type) AS goals
  FROM event
WHERE event.type = 'goal' AND event.player_id = ${req.params.id}
GROUP BY event.player_id
ORDER BY goals DESC`;
  connection.query(sql, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/players/:id/assist', (req, res) => {
  const sql = `SELECT extra.player_id AS playerId,count(extra.player_id) AS assist
FROM extra,event
WHERE event.id  = extra.event_id AND event.type = 'goal' AND extra.player_id = ${req.params.id}
GROUP BY extra.player_id
ORDER BY assist DESC`;
  connection.query(sql, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/players/:id/offside', (req, res) => {
  const sql = `SELECT event.player_id AS playerId, COUNT(event.type) AS offside
FROM event
WHERE event.type = 'offside' AND event.player_id = ${req.params.id}
GROUP BY event.player_id
ORDER BY offside DESC`;
  connection.query(sql, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/players/:id/fouls', (req, res) => {
  const sql = `SELECT event.player_id AS playerId, COUNT(event.type) AS fouls
FROM event
WHERE event.type in ('penalty lost','free kick lost','offside') AND event.player_id = ${req.params.id}
GROUP BY event.player_id
ORDER BY fouls DESC`;
  connection.query(sql, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/players/:id/yellowCard', (req, res) => {
  const sql = `SELECT event.player_id AS playerId, COUNT(event.type) AS yellowCard
FROM event
WHERE event.type = 'yellow card' AND event.player_id = ${req.params.id}
GROUP BY event.player_id
ORDER BY yellowCard`;
  connection.query(sql, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.get('/players/:id/redCard', (req, res) => {
  const sql = `SELECT event.player_id, COUNT(event.type) AS redCard
FROM event
WHERE event.type = 'red card' AND event.player_id = ${req.params.id}
GROUP BY event.player_id
ORDER BY redCard DESC`;
  connection.query(sql, function (err, rows, fields) {
    if (err) throw err
    res.json(rows)
  })
})

app.listen(port, () => console.log(`Server is running at http://${host}:${port}`))
