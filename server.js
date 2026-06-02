// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
  initializeDatabase,
  registerUser,
  findUserByEmail,
  storeLoginData,
  getUserLastLoginData,
  closeDatabase
} = require("./db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint (basic)
app.get("/", (req, res) => {
  res.send('App is hosted and active..');
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    time: new Date().toISOString()
  });
});

// ────────────────────────────────────────────────
//                  SIGNUP
// ────────────────────────────────────────────────
app.post("/api/auth/signup", async (req, res) => {
  const { email, username, password, phone, country, fullname } = req.body;
  console.log(req.body);
  if (!email || !username || !password) {
    return res.json({
      success: false,
      message: "All fields are required: email, username, password, phone number, country"
    });
  }

  let db_user = await findUserByEmail(email);
  let db_email; db_user.success?db_email = db_user.user.email:db_email = null;
  //console.log(db_email, db_user);

  if (db_email!=null && email == db_email) {
    console.log("Account already registered in db..")
    return res.json({
      success: false,
      message: "Account already registered in db.."
    });
  } else {
    const result = await registerUser({ email, username, password, phone, country, fullname });
    const user = result.user;
    //let {uname, mail, bal, profit} = user;
    if (user)
    console.log('proceeding to store user data as first login');
                      let login_data = {username: user.username, email: user.email, bal: user.bal, profit: user.profit, lastLogin: new Date().toLocaleString("en-US", {
                        timeZone: "Africa/Lagos",
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                      })};

                      console.log(login_data);
                      let store_login_time = await storeLoginData(login_data);

                      if (store_login_time.success) {
                        console.log('first login data stored successfully..')
                      } else {
                        console.log('store-login-data API error..')
                      };
    if (result.success) {
      console.log('new account created on: ', );
      return res.json({
        success: true,
        message: "Account created successfully",
        user: {
          username: user.username,
          firstname: user.fullname?user.fullname.split(" ")[0]:null,
          bal: user.bal,
          portfolio: user.portfolio,
        }
      });
    }

    return res.json({
      success: false,
      message: "Failed to create account..",

    });
  }


});

// ────────────────────────────────────────────────
//                  LOGIN
// ────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({
      success: false,
      message: "Email and password are required"
    });
  }

  const result = await findUserByEmail(email);

  if (!result.success) {
    console.log('user not found...');
    return res.json({
      success: false,
      message: "user not found"
    });
  }

  const user = result.user;
  console.log("user found: \n", result.user);

  let db_password = user.password;
  if(password!==db_password) {
    console.log("incorrect user password")
    return res.json({
      success: false,
      message: "incorrect user password"
    });
  };

  let user_login_data  = await getUserLastLoginData(email); let bal_diff;
  //console.log(user_login_data)
  if(user_login_data.success == true) {
    console.log("user login data:\n", user_login_data.data)
    //console.log(user.balData.bal, user_login_data.data.bal);
    if(user.balData.bal && user_login_data.data.bal);
    bal_diff = Number(user.balData.bal.replace(/,/g, "")) - Number(user_login_data.data.bal.replace(/,/g, ""));
    console.log('bal_diff type: ', typeof bal_diff); console.log("user data bal: ", Number(user.balData.bal.replace(/,/g, ""))); console.log("user login bal: ", Number(user_login_data.data.bal.replace(/,/g, "")))
    console.log('bal difference: \n', bal_diff)

  } else {
    console.log('No previous login data found for:', email);
  }

  console.log('user fullname: ', fullname);

  if( bal_diff!=undefined && bal_diff>0) {

    return res.json({
      success: true,
      message: "Login successful",
      //user: user
      user: {
        username: user.username,
        firstname: user.fullname?user.fullname.split(" ")[0]:null,
        email: user.email,
        bal: user.balData.bal,
        profit: user.balData.profit,
        portfolio: user.portfolio,
        ballDiff: bal_diff
      }
    });
  }

  return res.json({
    success: true,
    message: "Login successful",
    //user: user
    user: {
      username: user.username,
      firstname: user.fullname?user.fullname.split(" ")[0]:null,
      email: user.email,
      bal: user.balData.bal,
      profit: user.balData.profit,
      portfolio: user.portfolio
    }
  });
});

app.post("/api/auth/store-login-data", async (req, res) => {
  const { username, email, bal, profit, lastLogin } = req.body;


  if (!username && !email && !bal && !profit && !lastLogin) {
    console.log("incomplete login data..")
    return res.json({
      success: false,
      message: "incomplete login data.."
    });
  }

  let login_data = {username, email, bal, profit, lastLogin};
  const result = await storeLoginData(login_data);

  if (!result.success) {
    console.log('server error...');
    return res.json({
      success: false,
      message: "server error.."
    });
  }


  return res.json({
    success: true,
    message: "Login data stored successfully...",
  });
});

//check for price update
//get user data from user collection and get the last login data
//if the bal in user-data is greater than the last login data, return the difference

// Export the app so index.js can use it
module.exports = { app, initializeDatabase, closeDatabase };
