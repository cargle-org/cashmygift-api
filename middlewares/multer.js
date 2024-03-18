const multer = require("multer");
const DataUriParser = require("datauri/parser");
const path = require("path");

const storage = multer.memoryStorage();
const parser = new DataUriParser();

const multerUploads = multer({ storage });

const dataUri = (req) => {
  console.log(req.file);
  return parser.format(
    path.extname(req.file.originalname).toString(),
    req.file.buffer
  );
};

const thumbnailDataUri = (req) => {
  console.log(req);
  return parser.format(path.extname(req.originalname).toString(), req.buffer);
};

module.exports = { multerUploads, dataUri, thumbnailDataUri };
