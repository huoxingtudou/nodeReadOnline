const UPLOAD_PATH = "D:/readOnline/nginx-1.18.0/ebook"
const OLDUPLOAD_URL = "file:///D:/readOnline/ebook/res/img"
const UPLOAD_URL = "file:///D:/readOnline/nginx-1.18.0/ebook/"
module.exports = {
  CODE_ERROR: -1,
  CODE_SUCCESS: 0,
  CODE_TOKEN_EXPRESS: -2,
  debug: true,
  PRIVATE_KEY: "readOline",
  JWT_EXPIRED: 60 * 60,
  UPLOAD_PATH,
  MIME_TYPE_EPUB: "application/epub+zip",
  UPLOAD_URL,
  OLDUPLOAD_URL

  // PWD_SALT: 'admin_imooc_node',
}