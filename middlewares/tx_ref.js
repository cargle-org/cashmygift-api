const moment = require("moment");

//generate random IDs for flutterwave tx_ref
// let tx_ref = 0;
let tx_ref = '';
const get_Tx_Ref = () => {
  const time = moment().format("YYYY-MM-DD hh:mm:ss");
  //   const rand = Math.floor(Math.random() * Date.now());
  const rand1 = Math.floor(Math.random() * 10) + 1;
  const ref = time.replace(/[\-]|[\s]|[\:]/g, "");
  tx_ref = parseInt(ref) * rand1;
  console.log(" ~ file: tx_ref.js ~ line 10 ~ tx_ref", tx_ref);

  return `${tx_ref}`;

  // const alphabets = [
  //     "a",
  //     "b",
  //     "c",
  //     "d",
  //     "e",
  //     "f",
  //     "g",
  //     "h",
  //     "i",
  //     "j",
  //     "k",
  //     "l",
  //     "m",
  //     "n",
  //     "o",
  //     "p",
  //     "q",
  //     "r",
  //     "s",
  //     "t",
  //     "u",
  //     "v",
  //     "w",
  //     "x",
  //     "y",
  //     "z",
  //     "A",
  //     "B",
  //     "C",
  //     "D",
  //     "E",
  //     "F",
  //     "G",
  //     "H",
  //     "I",
  //     "J",
  //     "K",
  //     "L",
  //     "M",
  //     "N",
  //     "O",
  //     "P",
  //     "Q",
  //     "R",
  //     "S",
  //     "T",
  //     "U",
  //     "V",
  //     "W",
  //     "X",
  //     "Y",
  //     "Z",
  // ];

  // const rand = Math.floor(Math.random() * 48);
  // const rand2 = Math.floor(Math.random() * 48);
  // const rand3 = Math.floor(Math.random() * 48);
  // const rand4 = Math.floor(Math.random() * 48);

  // const time = moment().format("yy-MM-DD hh:mm:ss");
  // const ref = time.replace(/[\-]|[\s]|[\:]/g, "");

  // tx_ref = `${alphabets[rand]}${alphabets[rand3]}${alphabets[rand2]}_${ref}${rand4}`;

  // return tx_ref;
};

module.exports = {
  get_Tx_Ref,
  tx_ref,
};
