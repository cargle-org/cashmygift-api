// Dependencies
const Joi = require("@hapi/joi");

//  Validation
const registerValidation = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().min(6).required().email(),
  phone: Joi.string().min(5).required(),
  password: Joi.string().min(4).required(),
  isCompany: Joi.boolean(),
  // companyLogo: Joi.object(),
  // firstName: Joi.string().min(2).required(),
  // lastName: Joi.string().min(2).required(),
  // companyName: Joi.string().min(2),
  // companyEmail: Joi.string().min(6).email(),
  // companyPhone: Joi.string().min(5),
  // confirmPassword: Joi.string().min(4).required(),
});

const loginValidation = Joi.object({
  email: Joi.string().min(6).required().email(),
  password: Joi.string().min(4).required(),
});

const editProfileValidation = Joi.object({
  name: Joi.string().min(2),
  email: Joi.string().min(6).email(),
  phone: Joi.string().min(5),
});

const createVoucherValidation = Joi.object({
  title: Joi.string().min(4).max(23).required(),
  logo: Joi.string().allow(""),
  backgroundStyle: Joi.string().min(4).required(),
  description: Joi.string().min(3).required(),
  voucherKey: Joi.string().min(5).max(5).required(),
  totalNumberOfVouchers: Joi.number().required(),
  amountPerVoucher: Joi.number().required(),
  // totalAmount: Joi.number().required(),
  voucherCoupons: Joi.array().required(),
  // expiry_date: Joi.string(),
  recipients: Joi.array(),
});

const createVoucherDraftValidation = Joi.object({
  title: Joi.string().min(4).max(23).required(),
  logo: Joi.string().allow(""),
  backgroundStyle: Joi.string().min(4).allow(""),
  description: Joi.string().min(3).allow(""),
  voucherKey: Joi.string().min(5).max(5).allow(""),
  totalNumberOfVouchers: Joi.number().allow(""),
  amountPerVoucher: Joi.number().allow(""),
  // totalAmount: Joi.number().required(),
  // voucherCoupons: Joi.array().required(),
  expiry_date: Joi.string().allow(""),
  // recipients: Joi.array(),
}).unknown(true);

const scheduleDeliveryValidation = Joi.object({
  to: Joi.string().min(4).max(23).required(),
  subject: Joi.string().min(4).max(23).required(),
  html: Joi.string().min(4).max(23).required(),
  deliveryTime: Joi.number().allow(""),
  status: Joi.string().min(4).max(23).required(),
}).unknown(true);

const cashoutVoucherValidation = Joi.object({
  fullName: Joi.string().min(2).required(),
  email: Joi.string().min(6).required().email(),
  voucherCode: Joi.string().required(),
  bankCode: Joi.string().min(3).required(),
  accountNumber: Joi.string().required(),
});

const cashoutVoucherAsAirtimeValidation = Joi.object({
  fullName: Joi.string().min(2).required(),
  email: Joi.string().min(6).required().email(),
  phone_number: Joi.string().min(11).required(),
  voucherCode: Joi.string().required(),
  biller_code: Joi.string().required(),
  item_code: Joi.string().required(),
});

module.exports = {
  registerValidation,
  loginValidation,
  editProfileValidation,
  createVoucherValidation,
  cashoutVoucherValidation,
  createVoucherDraftValidation,
  cashoutVoucherAsAirtimeValidation,
  scheduleDeliveryValidation
};
