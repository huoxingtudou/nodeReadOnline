const { MIME_TYPE_EPUB, UPLOAD_URL, UPLOAD_PATH, OLDUPLOAD_URL } = require('../utils/constant')
const fs = require('fs')
const path = require('path')
const Epub = require('../utils/epub')
const xml2js = require('xml2js').parseString
// const { resolve } = require('path')
// const { rejects } = require('assert')
class Book {
  constructor(file, data) {
    if (file) {
      this.createBookFormFile(file)
    } else {
      this.createBookFormData(data)
    }
  }

  createBookFormFile(file) {
    console.log("createBookFormFile", file)
    const {
      destination, filename, mimetype = MIME_TYPE_EPUB, path, originalname
    } = file
    //电子书文件后缀名
    const suffix = mimetype === MIME_TYPE_EPUB ? '.epub' : ""
    // 电子书原有路径
    const oldBookPath = path
    // 电子书新路径
    const bookPath = `${destination}/${filename}${suffix}`
    // 电子书的下载URL链接
    const url = `${UPLOAD_URL}/book${filename}${suffix}`
    // 电子书解压后的文件夹路径
    const unzipPath = `${UPLOAD_PATH}/unzip/${filename}`
    // 电子书解压后文件夹路径
    const unzipUrl = `${UPLOAD_URL}/unzip${filename}`
    if (!fs.existsSync(unzipPath)) {
      fs.mkdirSync(unzipPath, { recursive: true })
    }
    if (fs.existsSync(oldBookPath) && !fs.existsSync(bookPath)) {
      fs.renameSync(oldBookPath, bookPath)
    }
    this.fileName = filename  //文件名
    this.path = `/book/${filename}${suffix}`
    this.unzipPath = `/unzip/${filename}`//epub解压后相对路径
    this.filePath = this.path
    this.url = url //epub文件下载路径
    this.title = '' //电子书标题
    this.author = '' //作者
    this.publisher = ''//出版社
    this.contents = []//目录
    this.contentsTree = [] //树状目录结构
    this.cover = ''//封面
    this.coverPath = ''//封面图片路径
    // this.coverUrl = ""//封面图片的链接
    this.category = -1//分类ID
    this.categoryText = ''//分类名称
    this.language = ''//语种
    this.unzipUrl = unzipUrl //解压后文件夹链接
    this.originalname = originalname

  }

  createBookFormData(data) {
    this.fileName = data.fileName
    this.cover = data.cover
    this.title = data.title
    this.author = data.author
    this.publisher = data.publisher
    this.bookId = data.fileName
    this.language = data.language
    this.rootFile = data.rootFile
    this.originalname = data.originalname
    this.path = data.path || data.filePath
    this.filePath = data.path || data.filePath
    this.unzipPath = data.unzipPath
    this.coverPath = data.coverPath
    this.createUser = data.username
    this.createDt = new Date().getTime()
    this.updateDt = new Date().getTime()
    this.updateType = data.updateType === 0 ? data.updateType : 1
    this.category = data.category || 99
    this.categoryText = data.categoryText || "自定义"
    this.contents = data.contents || []
  }

  parse() {
    return new Promise((resolve, rejects) => {
      const bookPath = `${UPLOAD_PATH}${this.filePath}`
      if (!fs.existsSync(bookPath)) {
        rejects(new Error('电子书不存在'))
      }
      const epub = new Epub(bookPath)
      epub.on('error', err => {
        rejects(err)
      })
      epub.on('end', err => {
        if (err) {
          rejects(err)
        } else {
          // console.log("epub", epub.manifest)
          const {
            title,
            language,
            creator,
            cover,
            creatorFileAs,
            publisher
          } = epub.metadata
          if (!title) {
            rejects(new Error("图书标题为空！"))
          } else {

            this.title = title
            this.language = language || "en"
            this.author = creator || creatorFileAs || "unknow"
            this.publisher = publisher || "unknow"
            this.rootFile = epub.rootFile
            try {
              this.unzip()
              this.parseContents(epub).then(({ chapters, contentsTree }) => {
                // console.log(chapters, 'hhhhh')
                this.contents = chapters
                this.contentsTree = contentsTree
                const handleGetImag = (err, file, mimetype) => {
                  // console.log(err, file, mimetype, 'hhhh')
                  if (err) {
                    rejects(err)
                  } else {
                    const suffix = mimetype.split('/')[1]
                    const coverPath = `${UPLOAD_PATH}/image/${this.fileName}.${suffix}`
                    const coverUrl = `${UPLOAD_URL}/image/${this.fileName}.${suffix}`
                    fs.writeFileSync(coverPath, file, 'binary')
                    this.coverPath = `/image/${this.fileName}.${suffix}`
                    this.cover = coverUrl
                    // console.log(this, 'weteqgrehtr')
                    resolve(this)
                  }
                }
                // console.log(cover, '1111')
                epub.getImage(cover, handleGetImag)
              })
            } catch (e) {
              rejects(e)
            }
            // resolve()
          }
        }
      })
      epub.parse()
    })

  }

  unzip() {
    const AdmZip = require('adm-zip')
    const zip = new AdmZip(Book.genPath(this.path))
    zip.extractAllTo(Book.genPath(this.unzipPath), true)
  }

  parseContents(epub) {
    function findParent(array, level = 0, pid = '') {

      return array.map(item => {
        item.level = level
        item.pid = pid
        if (item.navPoint && item.navPoint.length > 0) {
          item.navPoint = findParent(item.navPoint, level + 1, item['$'].id)
        } else if (item.navPoint) {
          item.navPoint.level + 1
          item.navPoint.pid = item['$'].id
        }
        return item
      })
    }
    function flatten(array) {
      return [].concat(...array.map(item => {
        if (item.navPoint && item.navPoint.length > 0) {
          return [].concat(item, ...flatten(item.navPoint))
        } else if (item.navPoint) {
          return [].concat(item, item.navPoint)
        }
        return item
      }))
    }
    function getNcxFilePath() {
      const spine = epub && epub.spine
      const manifest = epub && epub.manifest
      const ncx = spine.toc && spine.toc.href
      const id = spine.toc && spine.toc.id
      // console.log('spine', spine.toc, ncx, id, manifest[id].href)
      if (ncx) {
        return ncx
      } else {
        return manifest[id].href
      }
    }
    const ncxFilePath = Book.genPath(`${this.unzipPath}/${getNcxFilePath()}`)
    // console.log('ncxFilePath', ncxFilePath)
    if (fs.existsSync(ncxFilePath)) {
      return new Promise((resolve, rejects) => {
        const xml = fs.readFileSync(ncxFilePath, 'utf-8')
        const dir = path.dirname(ncxFilePath).replace(UPLOAD_PATH, "")
        // console.log(dir, 'dirdir')
        const fileName = this.fileName
        const unzipPath = this.unzipPath
        xml2js(xml, { explicitArray: false, ignoreAttrs: false }, function (err, json) {
          if (err) {
            rejects(err)
          } else {
            const navMap = json.ncx.navMap
            if (navMap.navPoint && navMap.navPoint.length > 0) {
              // console.log(navMap.navPoint, 'ewterh')
              navMap.navPoint = findParent(navMap.navPoint)
              const newNavMap = flatten(navMap.navPoint) // 将目录拆分为扁平结构
              const chapters = []
              newNavMap.forEach((chapter, index) => {
                // if (index + 1 > newNavMap.length) {
                //   return
                // }
                const nav = newNavMap[index]
                const src = chapter.content['$'].src
                chapter.text = `${UPLOAD_URL}${dir}/${src}`
                chapter.href = `${dir}/${src}`.replace(unzipPath, "")
                chapter.id = `${src}`
                chapter.label = chapter.navLabel.text || ""
                // console.log(chapter.text, 'dtysty')
                // if (nav && nav.navLabel) {
                //   chapter.label = nav.navLabel.text || ""
                // } else {
                //   chapter.label = ""
                // }
                // chapter.level = nav.level
                // chapter.pid = nav.pid
                chapter.navId = nav["$"].id
                chapter.fileName = fileName
                chapter.order = index + 1
                chapters.push(chapter)
                // console.log(chapters, 222222)

              });
              const contentsTree = Book.genContentsTree(chapters)
              // chapters.forEach(c => {
              //   c.children = []
              //   if (c.pid === '') {
              //     contentsTree.push(c)
              //   } else {
              //     const parent = chapters.find(_ =>
              //       _.navId === c.pid
              //     )
              //     parent.children.push(c)
              //   }
              // })
              // console.log(contentsTree, 46645654)
              resolve({ chapters, contentsTree })
            } else {
              rejects(new Error("目录解析失败，目录数为零"))
            }
            // console.log('xml', JSON.stringify(navMap));
          }
        })
      })
    } else {
      throw new Error('目录资源不存在')
    }

    // getNcxFilePath()
  }

  toDb() {
    return {
      fileName: this.fileName,
      cover: this.cover,
      title: this.title,
      author: this.author,
      publisher: this.publisher,
      bookId: this.fileName,
      language: this.language,
      rootFile: this.rootFile,
      originalname: this.originalname,
      filePath: this.filePath,
      unzipPath: this.unzipPath,
      coverPath: this.coverPath,
      createUser: this.createUser,
      createDt: this.createDt,
      updateDt: this.updateDt,
      updateType: this.updateType,
      category: this.category,
      categoryText: this.categoryText,
    }
  }

  getContents() {
    return this.contents
  }

  reset() {
    console.log(this.filePath, this.coverPath, this.unzipPath, 'hhhhhhhhh')
    if (Book.pathExists(this.filePath)) {
      fs.unlinkSync(Book.genPath(this.filePath))
    }
    if (Book.pathExists(this.coverPath)) {
      fs.unlinkSync(Book.genPath(this.coverPath))
    }
    if (Book.pathExists(this.unzipPath)) {
      fs.rmdirSync(Book.genPath(this.unzipPath), { recursive: true })
    }
  }

  static genPath(path) {
    if (!path.startsWith('/')) {
      path = `/${path}`
    }
    return `${UPLOAD_PATH}${path}`
  }

  static pathExists(path) {
    console.log(path, '49679934')
    if (path.startsWith(UPLOAD_PATH)) {
      return fs.existsSync(path)
    } else {
      return fs.existsSync(Book.genPath(path))
    }
  }

  static getCoverUrl(book) {
    const { cover } = book
    if (book.updateType === 0) {

      if (cover) {
        if (cover.startsWith('/')) {
          return `${OLDUPLOAD_URL}${cover}`
        } else {
          return `${OLDUPLOAD_URL}/${cover}`
        }

      } else {
        return null
      }
    } else {
      if (cover) {
        if (cover.startsWith('/')) {
          return `${OLDUPLOAD_URL}${cover}`
        } else {
          return `${OLDUPLOAD_URL}/${cover}`
        }

      } else {
        return null

      }
    }
  }

  static genContentsTree(contents) {
    if (contents) {
      const contentsTree = []
      contents.forEach(c => {
        c.children = []
        if (c.pid === '') {
          contentsTree.push(c)
        } else {
          const parent = contents.find(_ =>
            _.navId === c.pid
          )
          parent.children.push(c)
        }
      })
      return contentsTree
    }
  }
}

module.exports = Book 