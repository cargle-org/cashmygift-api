const Joi = require("@hapi/joi");

const createLink = Joi.object({
  category: Joi.string().valid("wedding", "birthday", "others"),
  name: Joi.string().required(),
  link: Joi.string().uri().required(),
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
