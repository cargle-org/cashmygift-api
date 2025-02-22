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

const logoDataUri = (file) => {
  const extName = path.extname(file.originalname).toString();
  return parser.format(extName, file.buffer).content;
};


module.exports = { multerUploads, dataUri, logoDataUri };
