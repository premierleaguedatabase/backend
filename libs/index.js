const applyWhere = (query = {}, tableName = '') => {
  const isQueryExist = Object.keys(query).length === 0
  return isQueryExist ? `SELECT * FROM ${tableName}` : whereByAttrs(query, tableName)
}

const whereByAttrs = (query = {}, tableName = '') =>
  Object.keys(query)
  .reduce(
    (prev, key, index) => prev.concat(`${(index !== 0) ? 'AND' : ''} ${tableName}.${key} = ${!parseInt(query[key]) ? `"${query[key]}"` : query[key]}`),
    `SELECT * FROM ${tableName} WHERE `
  )

module.exports = {
  applyWhere,
  whereByAttrs
}
