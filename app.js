const express = require('express')
const router = require('./router')
const bodyParser = require('body-parser')
const cors = require('cors')
const app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(cors())
app.use('/', router)
const server = app.listen(5000, function () {
  const { address, port } = server.address()
  console.log("http启动成功：http://%s:%s", address, port)
})



// 获取首页数据
app.get('/book/home/v2', (req, res) => {
  let openId = req.query.openId
  if (!openId) {
    onFail(res, OPEN_ID_NOT_NULL)
  } else {
    openId = decodeURIComponent(openId)
    homeService.home(
      openId,
      (results) => onSuccess(res, QUERY_OK, results),
      () => onFail(res, QUERY_FAILED)
    )
  }
})