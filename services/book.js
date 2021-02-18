const Book = require('../models/Book')
const db = require('../db')
const _ = require('lodash')

function exists(book) {
  const { title, author, publisher } = book
  const sql = `select * from book where title='${title}' and author='${author}' and publisher='${publisher}'`
  return db.queryOne(sql)
}
async function removeBook(book) {
  if (book) {
    book.reset()
  }
  if (book.fileName) {
    const removeBookSql = `delete from book where fileName='${book.fileName}'`
    const removeContentsSql = `delete from contents where fileName='${book.fileName}'`
    await db.querySql(removeBookSql)
    await db.querySql(removeContentsSql)
  }

}

async function insertContents(book) {
  const contents = book.getContents()
  if (contents && contents.length > 0) {
    for (let i = 0; i < contents.length; i++) {
      const content = contents[i]
      const _content = _.pick(content, [
        'fileName',
        'id',
        'href',
        'order',
        'level',
        'label',
        'pid',
        'text',
        'navId'
      ])
      await db.insert(_content, 'contents')
      console.log('_content', _content)
    }
  }
}

function insertBook(book) {
  return new Promise(async (resolve, rejects) => {
    try {
      if (book instanceof Book) {
        const result = await exists(book)
        if (result) {
          await removeBook(book)
          rejects(new Error("电子书已存在!"))
        } else {
          await db.insert(book.toDb(), 'book')
          await insertContents(book)
          resolve()
        }
      } else {
        rejects(new Error("添加的图书对象不合法!"))
      }
    } catch (e) {
      rejects(e)
    }
  })
}

async function updateBook(book) {
  return new Promise(async (resolve, rejects) => {
    try {
      if (book instanceof Book) {
        const result = await getBook(book.fileName)
        result = result.book
        if (result) {
          const model = book.toDb()
          if (+result.book.updateType === 0) {
            rejects(new Error('内置图书不能编辑'))
          } else {
            await db.update(model, 'book', `where fileName='${book.fileName}'`)
            resolve()
          }
          // await removeBook(book)
          // rejects(new Error("电子书已存在!"))
        } else {
          rejects(new Error("电子书不存在!"))
          // await db.insert(book.toDb(), 'book', `where fileName='${book.fileName}'`)
          // await insertContents(book)
          // resolve()
        }
      } else {
        rejects(new Error("编辑的图书对象不合法!"))
      }
    } catch (e) {
      rejects(e)
    }
  })
}

function getBook(fileName) {
  return new Promise(async (resolve, rejects) => {
    const bookSql = `select * from book where fileName='${fileName}'`
    const contentsSql = `select * from contents where fileName='${fileName}'`
    const book = await db.queryOne(bookSql)
    const contents = await db.queryOnes(contentsSql)
    if (book) {
      book.cover = Book.getCoverUrl(book)
      book.contentsTree = Book.genContentsTree(contents)
      resolve({ book })
    } else {
      rejects(new Error("电子书不存在"))
    }
  })
}

async function getCategory() {
  const sql = `select * from category order by category asc`
  const result = await db.querySql(sql)
  const categoryList = []
  result.forEach(item => {
    categoryList.push({
      label: item.categoryText,
      value: item.category,
      num: item.num
    })
  });
  return categoryList
}

async function listBook(query) {
  const { category, author, title, page = 1, pageSize = 20, sort } = query
  const offset = (page - 1) * pageSize
  let bookSql = 'select * from book'
  let where = "where"
  category && (where = db.and(where, 'category', category))
  author && (where = db.andLike(where, 'author', author))
  title && (where = db.andLike(where, 'title', title))
  // console.log(category, where, 'qqqqqqqqqqq')
  if (where !== 'where') {
    bookSql = `${bookSql} ${where}`
  }
  if (sort) {
    const symbol = sort[0]
    const column = sort.slice(1, sort.length)
    const order = symbol === '+' ? 'asc' : 'desc'
    bookSql = `${bookSql} order by \`${column}\` ${order}`
  }
  let countSql = `select count(*) as count from book`
  if (where !== 'where') {
    countSql = `${countSql} ${where}`
  }
  const count = await db.querySql(countSql)
  bookSql = `${bookSql} limit ${pageSize} offset ${offset}`
  const list = await db.querySql(bookSql)
  list.forEach(book => {
    book.cover = Book.getCoverUrl(book)
  })
  return { list, count: count[0].count, page, pageSize }
}

async function deleteBook(fileName) {
  return new Promise(async (resolve, rejects) => {
    console.log(fileName, 'hhhhhhh')
    let book = await getBook(fileName)
    book = book.book
    if (book) {
      // console.log(book.book.updateType, '11111111')
      if (book.updateType == '0') {
        rejects(new Error("内置电子书不能删除!"))
      } else {
        const bookObj = new Book(null, book)
        const bookSql = `delete from book  where fileName='${fileName}'`
        const contentsSql = `delete from contents  where fileName='${fileName}'`
        db.querySql(bookSql).then(() => {
          bookObj.reset()
          resolve()
        })
        db.querySql(contentsSql)
      }
    } else {
      rejects(new Error('该电子书不存在！'))
    }
  })


}

function wrapperCover(cover) {
  if (!cover.startsWith('http://')) {
    cover = `${resUrl}/img${cover}`
  }
  return cover
}
module.exports = { insertBook, getBook, updateBook, getCategory, listBook, deleteBook, wrapperCover }