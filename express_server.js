const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();
app.use(cookieParser());

const PORT = 8080;

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

//IN MEMORY
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

//HELPER FUNCTIONS
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
  }
  //does it need if conditional if duplicate? <not working>
};

const urlsForUser = (id) => {
  let userObj = {};
  for (let shortURL in urlDatabase) {
    
    if (urlDatabase[shortURL].userID === id) {
      userObj[shortURL] = urlDatabase[shortURL]     
    }
  }
 return userObj
  //returns the URLs where the userID is equal to the id of the currently logged-in user

  //ACTIVATE in /urls GET
};

const getUserByUrl = (shortURL) => {
  for(let url in urlDatabase) {
    if(url === shortURL) {
      return urlDatabase[url].userID
    }
  }
 };

const findUserByEmail = (email) => {
  for (let user in users) {
    const userObj = users[user];

    if (userObj.email === email) {
      // if found return the user
      return userObj;
    }
  }
  // if not found return false
  return false;
};

const findUserID = (email, password) => {
  for (let user in users) {
    const userObj = users[user];
    if (userObj.email === email && bcrypt.compareSync(password, userObj.password)) {
      return userObj;
    }
  }
  // if not found return false
  return false;

};


//END POINTS OR ROUTES

//basic homepage (choice to redirect to urls instead)
app.get("/", (req, res) => {
  //res.send("Hello!"); //they asked you to put this in.
  res.redirect("/urls");
});

app.get("/login", (req, res) => {
  const userID = req.cookies['user_id'];
  const templateVars = {
    user: users[userID],
  };
  res.render("login", templateVars);
});

//collects info from login bar, sets email cookie
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const foundEmail = findUserByEmail(email);
  const foundUser = findUserID(email, password);

  if (foundEmail && !foundUser) {
    res.status(403).send('Email found. Password incorrect.');
  } else if (!foundEmail) {
    res.status(403).send('Email not found. Register please.');
  }

  if (!foundUser) {
    res.status(403).send('Not listed. Register please.');
  }

  for (let userID in users) {
    const userDbEmail = users[userID].email;
    if (userDbEmail === email) {
      res.cookie('user_id', userID);
    }
  }
  res.redirect("/urls");
});

//deletes email cookie
app.post("/logout", (req, res) => {
  const userID = req.cookies['user_id'];
  const templateVars = {
    user: users[userID],
  };
  res.clearCookie("user_id", templateVars);
  res.redirect("/urls");
  console.log(userID)
  console.log(users)//testing
});

//takes in info from registration input, renders to register.ejs
app.get("/register", (req, res) => {
  const userID = req.cookies['user_id'];
  const templateVars = {
    user: users[userID],
  };
  res.render("register", templateVars);
});

//**CONSOLE LOG PRINTING TWICE FOR SOME REASON */
//New user - registers ID, sets cookie, adds to database
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  const foundUser = findUserByEmail(email);
  const foundUserObj = findUserID(email, password);

  if (foundUser) {
    res.status(400).send('Email already registered. Log in please!');
    //console.log(users);
  }

  if (foundUserObj !== undefined && !foundUser) {
    const id = generateRandomString();
    users[id] = {
      id,
      email,
      password: bcrypt.hashSync(password, saltRounds)
    };
    console.log(users);
    res.cookie("user_id", id);
    res.redirect("/urls");
  } else {
    //console.log(users);
    res.status(400).send('Please input an email address');
  }
});

//!!! MAY BE AFFECTED !!! <working>
//takes in info from registration input, renders to register.ejs
app.get("/urls", (req, res) => {
  const userID = req.cookies['user_id'];
  if (!userID) {
    //reroute to login page
    res.redirect('/login');
  } else {
    const userDB = urlsForUser(userID);
    console.log(userDB)
    const templateVars = {
      userDB,
      urlsDB: urlDatabase,
      user: users[userID]
    };
    res.render("urls_index", templateVars);
  }
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

////!!! MAY BE AFFECTED !!! 
//ROUTE /urls to /urls/${shortURL}. Updates database.
app.post("/urls", (req, res) => {
  const userID = req.cookies['user_id'];
  if (!userID) {
    //reroute to login page
    res.redirect('/login');
  } else {
  let longURL = req.body["longURL"];
  let shortURL = generateRandomString();

  updateUrlDatabase(shortURL, longURL, userID);
  //console.log(urlDatabase)

  res.redirect(`/urls/${shortURL}`);
  }
});

//!!! MAY BE AFFECTED !!!
//ROUTE to external website using longURL link!!
app.get("/u/:shortURL", (req, res) => {
  const userID = req.cookies['user_id'];
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

//!!! MAY BE AFFECTED !!!
//determines access to urls/new (if no, reroute)
// hangs onto user id for header, renders to register.ejs
app.get("/urls/new", (req, res) => {
  const userID = req.cookies['user_id'];
  if (!userID) {
    //reroute to login page
    res.redirect('/login');
  } else {
    const templateVars = {
      user: users[userID],
    };
    res.render("urls_new", templateVars);
  }

});

//PRIVATE data rendered to urls_show.ejs!!
app.get("/urls/:shortURL", (req, res) => {
  const userID = req.cookies['user_id'];
  const user = getUserByUrl(req.params.shortURL);
  if (!userID) {
    //reroute to login page
    res.redirect('/login');
  } else if (user === undefined || user !== userID) {
    res.status(400).send('No access! Doesn\'t Belong To You!');
  } else {
  const templateVars = {
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
    user: users[userID]
  };
  //console.log(templateVars[longURL])
  res.render("urls_show", templateVars);
}
});

//!!! MAY BE AFFECTED !!!
//ROUTE urls/:shortURL to /urls.
app.post('/urls/:shortURL', (req, res) => {
  const shortURL = req.params.shortURL;
  const longURLContent = req.body.longURLContent;
  const userID = req.cookies['user_id'];
  const user = getUserByUrl(shortURL);
  if (!userID) {
    //reroute to login page
    res.redirect('/login');
  } else if (user === undefined || user !== userID) {
    res.status(400).send('No access! Doesn\'t Belong To You!');
  } else {
  updateUrlDatabase(shortURL, longURLContent, userID);
  console.log(urlDatabase); //testing if duplicated...
  res.redirect('/urls');
  }
});

//deletes url from database. Routes back to /urls
app.post("/urls/:shortURL/delete", (req, res) => {
  const userID = req.cookies['user_id'];
  const user = getUserByUrl(req.params.shortURL);
  if (!userID) {
    //reroute to login page
    res.redirect('/login');
  } else if (user === undefined || user !== userID) {
    res.status(400).send('No access! Doesn\'t Belong To You!');
  } else {
  delete urlDatabase[req.params.shortURL];
  res.redirect("/urls");
  }
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
