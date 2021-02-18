const express = require('express')
const multer = require('multer')
const Result = require('../models/Results')
const book = require("../models/Book")
const boom = require('boom')
const { decode } = require('../utils')
const { UPLOAD_PATH } = require('../utils/constant')
const Book = require('../models/Book')
const router = express.Router()
const bookServer = require('../services/book')

router.post(
  '/upload',
  multer({ dest: `${UPLOAD_PATH}/book` }).single('file'),
  function (req, res, next) {
    // console.log(req, 1111111)
    if (!req.file || req.file.length === 0) {
      new Result("上传电子书失败").fail(res)
    } else {
      const Book = new book(req.file)
      // console.log(Book, 'hhhhhhh')
      Book.parse().then(book => {
        // console.log("book2", book);
        new Result(book, "上传电子书成功").success(res)


      }).catch(err => {
        next(boom.badImplementation(err))
      })


    }

  })

router.post('/create', function (req, res, next) {
  const decodes = decode(req)
  // console.log(decodes)

  // console.log(req.body)
  if (decodes && decodes.username) {
    req.body.username = decodes.username
  }
  const book = new Book(null, req.body)

  // console.log(book, 556867)
  bookServer.insertBook(book).then(() => {
    new Result("添加电子书成功").success(res)
  }).catch(err => {
    next(boom.badImplementation(err))
  })


})

router.post('/update', function (req, res, next) {
  const decodes = decode(req)
  // console.log(decodes)

  // console.log(req.body)
  if (decodes && decodes.username) {
    req.body.username = decodes.username
  }
  const book = new Book(null, req.body)

  // console.log(book, 556867)
  bookServer.updateBook(book).then(() => {
    new Result("更新电子书成功").success(res)
  }).catch(err => {
    next(boom.badImplementation(err))
  })


})

router.get('/get', function (req, res, next) {
  const { fileName } = req.query
  // console.log(req, fileName, '11111')
  if (!fileName) {
    next(boom.badRequest(new Error('参数fileNmae不能为空！')))
  } else {
    bookServer.getBook(fileName).then(book => {
      new Result(book, '获取图书信息成功').success(res)
    }).catch(err => {
      next(boom.badImplementation(err))
    })
  }

})

router.get('/getCategory', function (req, res, next) {
  bookServer.getCategory().then(category => {
    new Result(category, "获取分类成功").success(res)
  }).catch(err => {
    next(boom.badImplementation(err))
  })
})

router.get('/listBook', function (req, res, next) {
  bookServer.listBook(req.query).then(({ list, count, page, pageSize }) => {
    new Result({ list, count, page: + page, pageSize: + pageSize }, "获取图书列表成功").success(res)
  }).catch(err => {
    next(boom.badImplementation(err))
  })
})

router.get('/deleteBook', function (req, res, next) {
  const { fileName } = req.query
  if (!fileName) {
    next(boom.badRequest(new Error('参数fileNmae不能为空！')))
  } else {
    bookServer.deleteBook(fileName).then(() => {
      new Result('删除图书信息成功').success(res)
    }).catch(err => {
      next(boom.badImplementation(err))
    })
  }

})
module.exports = router

