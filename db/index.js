const mysql = require('mysql')
const config = require('./config')
const debug = require('../utils/constant').debug
const { isObject } = require('../utils')

function connect() {
  return mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    multipleStatements: true
  })
}
function querySql(sql) {
  const conn = connect()
  debug && console.log(sql)
  return new Promise((resolve, reject) => {
    try {
      conn.query(sql, (err, results) => {
        if (err) {
          // debug && console.log('查询失败，原因:' + JSON.stringify(err))
          reject(err)
        } else {
          // debug && console.log('查询成功', JSON.stringify(results))
          resolve(results)
        }
      })
    } catch (e) {
      reject(e)
    } finally {
      conn.end()
    }
  })
}

function queryOne(sql) {
  return new Promise((resolve, reject) => {
    querySql(sql).then(results => {
      if (results && results.length > 0) {

        resolve(results[0])
      } else {
        resolve(null)
      }
    }).catch(err => {
      reject(err)
    })
  })

}

function queryOnes(sql) {
  return new Promise((resolve, reject) => {
    querySql(sql).then(results => {
      if (results && results.length > 0) {

        resolve(results)
      } else {
        resolve(null)
      }
    }).catch(err => {
      reject(err)
    })
  })

}
function insert(model, tableName) {
  return new Promise((resolve, rejects) => {
    if (!isObject(model)) {
      rejects(new Error("插入数据库失败，插入数据非对象"))
    } else {
      const keys = []
      const values = []
      Object.keys(model).forEach(key => {
        if (model.hasOwnProperty(key)) {
          keys.push(`\`${key}\``)
          values.push(`'${model[key]}'`)
        }
      })
      if (keys.length > 0 && values.length > 0) {
        let sql = `INSERT INTO \`${tableName}\` (`
        const keysString = keys.join = keys.join(',')
        const valueString = values.join(',')
        sql = `${sql}${keysString}) VALUES (${valueString})`
        // debug && console.log(sql, 'hhhhh')
        const conn = connect()
        try {
          conn.query(sql, (err, result) => {
            if (err) {
              rejects(err)
            } else {
              resolve(result)
            }
          })
        } catch (e) {
          rejects(e)
        } finally {
          conn.end()
        }
      } else {
        rejects(new Error("插入数据库失败，对象中没有任何属性！"))
      }
    }
  })
}
function update(model, tableName, where) {
  return new Promise((resolve, rejects) => {
    if (!isObject(model)) {
      rejects(new Error("插入数据库失败，插入数据非对象"))
    } else {
      const entry = []
      Object.keys(model).forEach(key => {
        if (model.hasOwnProperty(key)) {
          entry.push(`\`${key}\`='${model[key]}'`)
        }
      })
      if (entry.length > 0) {
        let sql = `UPDATE \`${tableName}\` SET`
        sql = `${sql} ${entry.join(',')} ${where}`
        console.log(sql)
        const conn = connect()
        try {
          conn.query(sql, (err, results) => {

            if (err) {
              rejects(err)
            } else {
              resolve(results)
            }
          })
        } catch (e) {
          rejects(e)
        } finally {
          conn.end()
        }
      } else {
        rejects(new Error("插入数据库失败，对象中没有任何属性！"))
      }
    }
  })
}
function querySqlList(sql, onSuccess, onFail) {
  const conn = connect()
  debug && console.log(sql)
  const resultList = []
  let index = 0
  function next() {
    index++
    if (index < sql.length) {
      query()
    } else {
      conn.end()
      onSuccess && onSuccess(resultList)
    }
  }
  function query() {
    conn.query(sql[index], (err, results) => {
      if (err) {
        console.log('操作失败，原因:' + JSON.stringify(err))
        onFail && onFail()
      } else {
        // debug && console.log('操作成功', JSON.stringify(results))
        resultList.push(results)
        next()
      }
    })
  }
  query()
}
function and(where, k, v) {
  if (where === 'where') {
    return `${where} \`${k}\`=${v}`
  } else {
    return `${where} and \`${k}\`=${v}`
  }
}
function andLike(where, k, v) {
  if (where === 'where') {
    return `${where} \`${k}\`like '%${v}%'`
  } else {
    return `${where} and \`${k}\`like '%${v}%'`
  }
}
module.exports = {
  querySql, queryOne, insert, queryOnes, update, and, andLike, querySqlList
}