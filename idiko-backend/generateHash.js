const bcrypt = require("bcryptjs");

const password = "@HudumaKenya+254";

bcrypt.hash(password, 10).then((hash) => {
  console.log("HASH:");
  console.log(hash);
});