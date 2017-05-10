const makeAnSQLStatement = (query = {}, tableName = '') => {
  let sql = ''
  const attrs = {}
  Object.keys(query)
    .filter(isAnAttrs)
    .forEach(key => attrs[key] = query[key])
  isObjectEmpty(attrs)
    ? sql += `SELECT * FROM ${tableName}`
    : sql += applyWhereByAttrs(attrs, tableName)
  isQueryHaveAPageAndLimit(query)
    ? sql += applyLimitAndOffset(query)
    : sql
  return sql
}

const applyLimitAndOffset = (query = {}) => {
  const limit = query['_limit']
  const offset = (query['_page'] - 1) * query['_limit']
  return ` LIMIT ${limit} OFFSET ${offset}`
}

const isAnAttrs = (key = '') => key.charAt(0) !== '_'

const isQueryHaveAPageAndLimit = (query = {}) => query.hasOwnProperty('_page') && query.hasOwnProperty('_limit')

const isObjectEmpty = (obj = {}) => Object.keys(obj).length === 0

const applyWhereByAttrs = (attrs = {}, tableName = '') =>
  Object.keys(attrs)
  .reduce(
    (prev = '', key = '', index, keys) => prev.concat(`${(index !== 0) ? 'AND' : ''} ${tableName}.${key} = ${!parseInt(attrs[key]) ? `"${attrs[key]}"` : attrs[key]}`),
    `SELECT * FROM ${tableName} WHERE `)


module.exports = {
  makeAnSQLStatement
}
