const { dataUri, thumbnailDataUri } = require("../middlewares/multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { uploader } = require("../configs/cloudinary.config");

const imageFileFilter = (file) =>
  file.mimetype === "image/png" ||
  file.mimetype === "image/jpg" ||
  file.mimetype === "image/jpeg";

const uploadImageSingle = async (req, res, next) => {
  try {
    if (req.files.thumbnail) {
      if (imageFileFilter(req.file)) {
        const file = dataUri(req).content;
        console.log("--reached 1 Cloudinary--");
        const result = await uploader.upload(file, {
          public_id: `Damaged-${Date.now()}`,
        });
        console.log("result.url", result.url);
        return result.url;
      } else {
        return res.status(500).send({
          success: false,
          message:
            "Invalid file format. Only .png, .jpg and .jpeg formats are allowed!",
        });
      }
    } else {
      return res.status(500).send({
        success: false,
        message: "No file sent",
      });
    }
  } catch (err) {
    console.log(err);
  }
};

const uploadThumbnail = async (req, res, next) => {
  //specially for vouchers
  try {
    if (req[0]) {
      if (imageFileFilter(req[0])) {
        const file = thumbnailDataUri(req[0]).content;
        console.log("--reached 1 Cloudinary--");
        const result = await uploader.upload(file, {
          public_id: `Damaged-${Date.now()}`,
        });
        console.log("result.url", result.url);
        return result.url;
      } else {
        return res.status(500).send({
          success: false,
          message:
            "Invalid file format. Only .png, .jpg and .jpeg formats are allowed!",
        });
      }
    } else {
      return res.status(500).send({
        success: false,
        message: "No file sent",
      });
    }
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  uploadImageSingle,
  uploadThumbnail,
};
