const findUserByEmail = require('./helpers.js').findUserByEmail;
const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
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
  "b2xVn2": { longURL: "http://www.lighthouselabs.ca", userID: "userRandomID" },
  "9sm5xK": { longURL: "http://www.google.com", userID: "userRandomID" }
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
  return false;
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
  const userID = req.session['user_id'];
  if (!userID) {
    res.redirect("/login");
  }
  res.redirect("/urls");
});

////-- User Authentication --////

//Sets userID cookie. Renders to login.ejs. Conditions.
app.get("/login", (req, res) => {
  const userID = req.session['user_id'];
  if (!userID) {
    const templateVars = {
      user: users[userID],
    };
    res.render("login", templateVars);
  } else{
  res.redirect("/urls");
  }
});

//Authenicates login. Cookies id(email). Conditions.
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const foundEmail = findUserByEmail(email, users);
  const foundUser = findUserID(email, password);

  if (foundEmail && !foundUser) {
    res.render('error_login_password', {user: null});
  } else if (!foundEmail) {
    res.status(403);
    res.render('error_login_new', {user: null})
    //res.status(403).send('Email not found. Register please.');
  }

  if (!foundUser) {
    res.render('error_login_new')
    //res.status(403).send('Not listed. Register please.');
  }

  for (let userID in users) {
    const userDbEmail = users[userID].email;
    if (userDbEmail === email) {
      req.session['user_id'] = userID;
    }
  }
  res.redirect("/urls");
});

//Renders new user id to register.ejs. Conditions.
app.get("/register", (req, res) => {
  const userID = req.session['user_id'];
  if (!userID) {
    const templateVars = {
      user: users[userID],
    };
    res.render("register", templateVars);
  } else {
    res.redirect("/urls");
  }
});


//New user - registers ID, sets cookie, adds to database. Conditions.
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  const foundUser = findUserByEmail(email, users);
  const foundUserObj = findUserID(email, password);
  const templateVars = {
    user: null,
  }

  if(email === "" || password === "") {
    res.render('invalid_credentials', templateVars);
  } else if (foundUser) {
    res.render('error_existing_user', templateVars);
  } else {
    const id = generateRandomString();
    users[id] = {
      id,
      email,
      password: bcrypt.hashSync(password, saltRounds)
    };
    req.session['user_id'] = id;
    res.redirect("/urls");
  }
});

//deletes userID cookie
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect('/urls');
});



////-- Url Management --////

//Renders url input, usersDB memory and id to register.ejs
app.get("/urls", (req, res) => {
  const userID = req.session['user_id'];
  const templateVars = {
    user: userID,
    errorMessage: "Login or register to access this page."}
  if (!userID) {
      res.render("error_urls", templateVars);
  } else {
    const userDB = urlsForUser(userID);
    const templateVars = {
      userDB,
      urlsDB: urlDatabase,
      user: users[userID]
    };
    res.render("urls_index", templateVars);
  }
});

//ROUTE /urls to /urls/${shortURL}. Updates database. 
app.post("/urls", (req, res) => {
  const userID = req.session['user_id'];
  if (!userID) {
    res.status(401);
    res.redirect('/login');//HTML
  } else {
     let inputURL = req.body["longURL"];
    let shortURL = generateRandomString();

    //BONUS http:// glitch addressed
    const longURL = formatLongUrl(inputURL);

    updateUrlDatabase(shortURL, longURL, userID);
    res.redirect(`/urls/${shortURL}`);
  }
});

// Renders user id to register.ejs
app.get("/urls/new", (req, res) => {
  const userID = req.session['user_id'];
  if (!userID) {
    res.redirect('/login'); 
  } else {
    const templateVars = {
      user: users[userID],
    };
    res.render("urls_new", templateVars);
  }
});

//ROUTE to external website using longURL link. Else redirect.
app.get("/u/:shortURL", (req, res) => {
  if (urlDatabase[req.params.shortURL]) {
    const longURL = urlDatabase[req.params.shortURL].longURL;
    res.redirect(longURL);
  }
    res.redirect('/urls');
});

//Renders user data to urls_show.ejs. Conditions.
app.get("/urls/:shortURL", (req, res) => {
  const userID = req.session['user_id'];
  const user = getUserByUrl(req.params.shortURL);
  if (!userID) {
    res.render("error_urls", {
      user:userID,
      errorMessage: 'Custom short URL accessible post login'
    })
  } else if (user === undefined || user !== userID) {
    res.render("error_urls", {
      user:userID,
      errorMessage:'Woops! This url feature isn\'t accessible to you!'
    })
  } else {
    const templateVars = {
      shortURL: req.params.shortURL,
      longURL: urlDatabase[req.params.shortURL].longURL,
      user: users[userID]
    };
    res.render("urls_show", templateVars);
  }
});

//ROUTE urls/:shortURL to /urls. Conditions.
app.post('/urls/:shortURL', (req, res) => {
  const shortURL = req.params.shortURL;
  const longURLContent = req.body.longURLContent;
  const userID = req.session['user_id'];
  const user = getUserByUrl(shortURL);
  if (!userID) {
    //message on login page
    res.redirect('/login');
  } else if (user === undefined || user !== userID) {
    res.render("error_urls", {
      user:userID,
      errorMessage:'Woops! This url feature isn\'t accessible to you!'
    });//HTML
  } else {
    updateUrlDatabase(shortURL, longURLContent, userID);
    res.redirect('/urls');
  }
});

//deletes url from database. Routes back to /urls
app.post("/urls/:shortURL/delete", (req, res) => {
  const userID = req.session['user_id'];
  const user = getUserByUrl(req.params.shortURL);
  if (!userID) {
    //message on login page
    res.redirect('/login');
  } else if (user === undefined || user !== userID) {
    res.render("error_urls", {
      user:userID,
      errorMessage:'Woops! This url feature isn\'t accessible to you!'
    });
  } else {
    delete urlDatabase[req.params.shortURL];
    res.redirect("/urls");
  }
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});