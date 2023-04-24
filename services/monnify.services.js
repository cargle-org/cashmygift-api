const axios = require("axios");
const asyncHandler = require("../middlewares/asyncHandler");

// var monnify = new Monnify(
//     process.env.MONNIFY_SECRET_KEY,
//     process.env.MONNIFY_API_KEY,
//     process.env.MONNIFY_BASE_URL
// );

var key = Buffer.from(
    process.env.MONNIFY_API_KEY + ":" + process.env.MONNIFY_SECRET_KEY
).toString("base64");
const options = {
    timeout: 1000 * 60,
    headers: {
        "content-type": "application/json",
        Authorization: `Basic ${key}`,
    },
};

exports.obtainAccessToken = asyncHandler(async(payload) => {
    const response = await axios.post(
        `${process.env.MONNIFY_BASE_URL}/api/v1/auth/login`,
        payload,
        options
    );
    return response.data.responseBody.accessToken;
});

exports.getBanks = asyncHandler(async(accessToken) => {
    const response = await axios.get(
        `${process.env.MONNIFY_BASE_URL}/api/v1/banks`, {
            timeout: 1000 * 60,
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );
    return response.data.responseBody;
});

exports.initializePayment = asyncHandler(async(details, accessToken) => {
    let requestBody = {
        amount: details.amount,
        customerName: details.name,
        customerEmail: details.email,
        paymentReference: new String(new Date().getTime()),
        paymentDescription: details.description,
        currencyCode: "NGN",
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        // paymentMethods: [
        //     process.env.MONNIFY_CARD_PAYMENT_METHOD,
        //     process.env.MONNIFY_ACCOUNT_TRANSFER_PAYMENT_METHOD,
        // ],
        redirectUrl: process.env.MONNIFY_REDIRECT_URL,
    };
    const response = await axios.post(
        `${process.env.MONNIFY_BASE_URL}/api/v1/merchant/transactions/init-transaction`,
        requestBody, {
            timeout: 1000 * 60,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        }
    );
    return response.data.responseBody;
});

exports.withdraw = async(details, accessToken) => {
    let requestBody = {
        amount: details.amount,
        reference: new String(new Date().getTime()),
        narration: "Credit Rider Account",
        destinationBankCode: details.destinationBankCode,
        destinationAccountNumber: details.destinationAccountNumber,
        currency: "NGN",
        sourceAccountNumber: process.env.MONNIFY_WALLET_ACCOUNT_NUMBER,
        destinationAccountName: details.destinationAccountName,
    };
    const response = await axios.post(
        `${process.env.MONNIFY_BASE_URL}/api/v2/disbursements/single`,
        requestBody, {
            timeout: 1000 * 60,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        }
    );
    return response.data.responseBody;
};

exports.validateBankAccount = asyncHandler(
    async(accountNumber, bankCode, accessToken) => {
        const response = await axios.get(
            `${process.env.MONNIFY_BASE_URL}/api/v1/disbursements/account/validate?accountNumber=${accountNumber}&bankCode=${bankCode}`, {
                timeout: 1000 * 60,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );
        return response.data.responseBody;
    }
);