const axios = require("axios");
require("dotenv").config();

const Flutterwave = require("flutterwave-node-v3");

const baseURL = process.env.FLUTTERWAVE_BASE_URL;
const FLW_pubKey = process.env.FLUTTERWAVE_PUBLIC_KEY;
const FLW_secKey = process.env.FLUTTERWAVE_SECRET_KEY;

// TEST Mode
// const FLW_pubKey = process.env.FLUTTERWAVE_TEST_PUBLIC_KEY;
// const FLW_secKey = process.env.FLUTTERWAVE_TEST_SECRET_KEY;

const flw = new Flutterwave(FLW_pubKey, FLW_secKey);

const options = {
  timeout: 1000 * 60,
  headers: {
    "content-type": "application/json",
    Authorization: `Bearer ${FLW_secKey}`,
  },
};

const initiateTransaction = async (payload) => {
  try {
    const response = await axios.post(`${baseURL}/payments`, payload, options);
    // console.log(`Bearer ${FLW_secKey}`);
    console.log(
      "🚀 ~ file: flutterwave.services.js:28 ~ initiateTransaction ~ response:",
      response
    );
    return response.data.data.link;
  } catch (err) {
    console.log(err);
  }
};

const verifyTransaction = async (id) => {
  try {
    const response = await axios.get(
      `${baseURL}/transactions/${id}/verify`,
      options
    );
    console.log("verify: ", response.data);
    return response.data.data;
  } catch (err) {
    console.log(err);
  }
};

const transferMoney = async (payload) => {
  console.log(
    "🚀 ~ file: flutterwave.services.js:52 ~ transferMoney ~ payload:",
    payload
  );
  try {
    const response = await axios.post(`${baseURL}/transfers`, payload, options);
    console.log(
      "🚀 ~ file: flutterwave.services.js:52 ~ transferMoney ~ response:",
      response.data
    );
    return response.data.data;
  } catch (err) {
    console.log("Transfer error: ", err.response);
    return {status: "error", message: err.response.data.message};
    // return res.status(400).send({
    //   success: false,
    //   message: "Error, couldn't process transfer",
    //   errMessage: err.message,
    // });
  }

  // try {
  //     const response = await flw.Transfer.initiate(payload);
  //     console.log(
  //         "🚀 ~ file: flutterwave.services.js:50 ~ transferMoney ~ response:",
  //         response
  //     );
  //     return response.data;
  // } catch (err) {
  //     console.log(err);
  //     return res.status(400).send({
  //         success: false,
  //         message: "Couldn't process transfer",
  //     });
  // }
};

const runTF = async (details) => {
  try {
    console.log("runTF ~ details:", details);
    await flw.Transfer.initiate(details).then(console.log).catch(console.log);
  } catch (error) {
    console.log(
      "🚀 ~ file: flutterwave.services.js:94 ~ runTF ~ error:",
      error
    );
  }
};

module.exports = {
  initiateTransaction,
  verifyTransaction,
  transferMoney,
  runTF,
};
