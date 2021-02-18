const express = require('express')

const Result = require('../models/Results')
// const { querySql } = require('../db')

const { login, findUser } = require('../services/user')
const { PRIVATE_KEY, JWT_EXPIRED } = require('../utils/constant')
const { decode } = require('../utils')
const { body, validationResult } = require('express-validator')
const boom = require('boom')
const jwt = require('jsonwebtoken')
const router = express.Router()

router.post('/login', [
  body('username').isString().withMessage('username类型不正确'),
  body('password').isNumeric().withMessage('密码必须为数字')
], function (req, res, next) {
  const err = validationResult(req)
  if (!err.isEmpty()) {
    const [{ msg }] = err.errors
    next(boom.badRequest(msg))
  } else {
    let { username, password } = req.body
    // password = md5({ s: `${password}${PWD_SALT}` })
    login(username, password).then(user => {
      if (!user || user.length === 0) {
        new Result('登录失败').fail(res)
      } else {
        const token = jwt.sign({ username },
          PRIVATE_KEY,
          { expiresIn: JWT_EXPIRED }
        )
        new Result({ token }, '登录成功').success(res)
      }
    })
  }

})
router.get('/info', function (req, res, next) {
  // let { username } = res.body
  const decoded = decode(req)
  if (decoded && decoded.username) {
    findUser(decoded.username).then(user => {
      console.log(user)
      if (user) {
        user.roles = [user.role]
        new Result(user, "用户信息查询成功").success(res)
      } else {
        new Result(null, "用户信息查询失败").fail(res)
      }

    })
  } else {
    new Result(null, "用户信息查询失败").fail(res)
  }
  // console.log(decode(req))

})
module.exports = router