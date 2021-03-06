const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const findUserByEmail = require('./helpers.js').findUserByEmail;
const bcrypt = require('bcrypt');
const saltRounds = 10;
const PORT = 8080;
const app = express();
app.use(
  cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

//////////////IN MEMORY//////////////
const urlDatabase = {
  "b2xVn2": {
    shortURL: "b2xVn2",
    longURL: "http://www.lighthouselabs.ca",
    userID: "userRandomID"
  },
  "9sm5xK": {
    shortURL: "9sm5xK",
    longURL: "http://www.google.com",
    userID: "userRandomID"
  }
};
const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync("purple-monkey-dinosaur", saltRounds),
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("dishwasher-funk", saltRounds),
  }
};

/////////////HELPER FUNCTIONS/////////////
const generateRandomString = () => {
  let result = "";
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

//used in /urls/:shortURL POST
const updateUrlDatabase = (shortURL, content, id) => {
  urlDatabase[shortURL] = {
    shortURL,
    longURL: content,
    userID: id
  };
};

//updates a custom user database
const urlsForUser = (id) => {
  let userObj = {};
  for (let shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      userObj[shortURL] = urlDatabase[shortURL];
    }
  }
  return userObj;
};

const getUserByUrl = (shortURL) => {
  for (let url in urlDatabase) {
    if (url === shortURL) {
      return urlDatabase[url].userID;
    }
  }
};

const findUserID = (email, password) => {
  for (let user in users) {
    const userObj = users[user];
    if (userObj.email === email && bcrypt.compareSync(password, userObj.password)) {
      return userObj;
    }
  }
};

//resolves the http:// required for correct offsite redirection
const formatLongUrl = (longUrl) => {
  let reg = /^((http|https|ftp):\/\/)/;
  if (!reg.test(longUrl)) {
    return "http://" + longUrl;
  } else {
    return longUrl;
  }
};

//* findUserByEmail function exported to helpers.js


///////////END POINTS OR ROUTES///////////
app.get("/", (req, res) => {
  res.redirect("/urls");
});

////-- User Authentication --////

//Login GET - checks if logged in
app.get("/login", (req, res) => {
  const userID = req.session['user_id'];
  if (userID) {
    return res.redirect("/urls");
  }
  res.render("login", { user: undefined });
});

//Login POST - authentication.
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const foundEmail = findUserByEmail(email, users);
  const foundUser = findUserID(email, password);
  const templateVars = { errorMessage: "You're new! We don't have you listed." };
  if (foundEmail && !foundUser) {
    return res.render("error_login_password", { errorMessage: "Registered email! Incorrect password..." });
  } else if (!foundEmail) {
    return res.render("error_login_new", templateVars);
  }
  if (!foundUser) {
    return res.render("error_login_new", templateVars);
  }
  //if user aunthenticated, checks database for duplicate
  for (let userID in users) {
    const userDbEmail = users[userID].email;
    if (userDbEmail === email) {
      req.session['user_id'] = userID;
    }
  }
  res.redirect("/urls");
});

//Register GET - checks if logged in
app.get("/register", (req, res) => {
  const userID = req.session['user_id'];
  if (userID) {
    return res.redirect("/urls");
  }
  res.render("register", { user: undefined });
});

//Register POST - id authenticated. Conditions
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  const foundUser = findUserByEmail(email, users);
  if (foundUser) {
    return res.render("error_login_password", { errorMessage: "We already have you in our database." });
  }

  if (req.body.email === '' || req.body.password === '') {
    return res.render("error_login_new", { errorMessage: 'Please input an valid email address and password.' });
  }

  const id = generateRandomString();
  users[id] = {
    id,
    email,
    password: bcrypt.hashSync(password, saltRounds)
  };
  req.session['user_id'] = id;
  res.redirect("/urls");
});

//deletes userID cookie
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect('/urls');
});


////-- Url Management --////

//urls GET - Renders url input, usersDB memory and id to register.ejs
app.get("/urls", (req, res) => {
  const userID = req.session['user_id'];
  if (!userID) {
    return res.redirect('/login');
  }
  const userDB = urlsForUser(userID);
  const templateVars = {
    userDB,
    urlsDB: urlDatabase,
    user: users[userID]
  };
  res.render("urls_index", templateVars);
});

//urls POST - routes to /urls/${shortURL}. Updates database.
app.post("/urls", (req, res) => {
  const userID = req.session['user_id'];
  if (!userID) {
    return res.render("error_urls", { errorMessage: 'Login to access this page!' });
  }
  const inputURL = req.body["longURL"];
  let shortURL = generateRandomString();

  //BONUS http:// glitch addressed
  const longURL = formatLongUrl(inputURL);

  updateUrlDatabase(shortURL, longURL, userID);
  res.redirect(`/urls/${shortURL}`);
});

// urls/new GET - Renders user id to register.ejs
app.get("/urls/new", (req, res) => {
  const userID = req.session['user_id'];
  if (!userID) {
    return res.redirect('/login');
  }
  const templateVars = {
    user: users[userID],
  };
  res.render("urls_new", templateVars);

});

// u/:id GET - verifies and routes to external website using longURL link
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  console.log(longURL);
  // If the retrieved longURL is undefined, go to the "url not found" page.
  if (!longURL) {
    res.render("error_urls", { errorMessage: 'Woops! This url is not in our database.' });
  }
  res.redirect(longURL);
});

// urls/:id - GET Renders user data to urls_show.ejs. Conditions.
app.get("/urls/:shortURL", (req, res) => {
  const userID = req.session['user_id'];
  const userURL = getUserByUrl(req.params.shortURL);
  if (!userID) {
    return res.render("error_urls", { errorMessage: 'Login to access this page!' });
  } else if (userURL !== userID) {
    return res.render("error_urls", { errorMessage: 'Woops! This is not your url. No access.' });
  } else {
    const templateVars = {
      shortURL: req.params.shortURL,
      longURL: urlDatabase[req.params.shortURL].longURL,
      user: users[userID]
    };
    res.render("urls_show", templateVars);
  }
});

// urls/:id POST - routes to /urls. Conditions.
app.post('/urls/:shortURL', (req, res) => {
  const shortURL = req.params.shortURL;
  const longURLContent = req.body.longURLContent;
  const userID = req.session['user_id'];
  const userURL = getUserByUrl(shortURL);
  if (!userID) {
    //message on login page
    res.redirect('/login');
  } else if (userURL !== userID) {
    return res.render("error_urls", { errorMessage: 'Woops! This is not your url. No access.' });
  } else {
    updateUrlDatabase(shortURL, longURLContent, userID);
    res.redirect('/urls');
  }
});

//urls/:id/delete
app.post("/urls/:shortURL/delete", (req, res) => {
  const userID = req.session['user_id'];
  const user = getUserByUrl(req.params.shortURL);
  if (!userID) {
    //message on login page
    res.redirect('/login');
  } else if (user !== userID) {
    return res.render("error_urls", { errorMessage: 'No access! Feature reserved for registered user.' });
  } else {
    delete urlDatabase[req.params.shortURL];
    res.redirect("/urls");
  }
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});