const Joi = require("@hapi/joi");

const createLink = Joi.object({
  category: Joi.string().valid("wedding", "birthday", "others"),
  title: Joi.string().required(),
  description: Joi.string().required(),
  link: Joi.string().uri().required(),
  linkExpiry: Joi.date().iso(),
  amount: Joi.number().positive().max(200000).required()
});

const payToLink = Joi.object({
    amount: Joi.number().required(),
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    link: Joi.string().uri().required()
})

module.exports = {
  createLink,
  payToLink
};
