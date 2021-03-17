const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const app = express();
app.use(cookieParser());

const PORT = 8080;

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

//IN MEMORY
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};

//HELPER FUNCTIONS
function generateRandomString() {
  let result = "";
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const updateUrlDatabase = (shortURL, content) => {
  urlDatabase[shortURL] = content;
};

const findUserByEmail = (email) => {
  // loop and try to match the email
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

    if (userObj.email === email && userObj.password === password) {
      // if found return the user
      return userObj;
    }
  }
  // if not found return false
  return false;
  
}


//END POINTS OR ROUTES

//basic homepage (choice to redirect to urls instead)
app.get("/", (req, res) => {
  res.send("Hello!");
  res.redirect("/urls");
});

//collects info from login bar, sets email cookie
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const foundEmail = findUserByEmail(email);
  const foundUser = findUserID(email, password);
  
  if(foundEmail && !foundUser) {
    res.status(403).send('Email found. Password incorrect.')
  } else if (!foundEmail) {
    res.status(403).send('Email not found. Register please.')
  }

  if(!foundUser) {
    res.status(403).send('Not listed. Register please.')
  }

  for(let userID in users) {
    const userDbEmail = users[userID].email;
    if( userDbEmail === email) {
      res.cookie('user_id',userID);
    }
   }


  // const templateVars = { "user_id": req.body.email };
  // res.cookie("user_id", templateVars);

  //set the user_id cookie with the matching user's random ID
  //*GUESS** userID = req.cookies['user_id']

  res.redirect("/urls");
});

app.get("/login", (req, res) => {
  userID = req.cookies['user_id']
  const templateVars = {
    user: users[userID],
  }
  res.render("login", templateVars);
});

//deletes email cookie
app.post("/logout", (req, res) => {
  userID = req.cookies['user_id']
  const templateVars = {
    user: users[userID],
  }
  res.clearCookie("user_id", templateVars);
  res.redirect("/urls");
});


//takes in info from registration input, renders to register.ejs
app.get("/register", (req, res) => {
  userID = req.cookies['user_id']
  const templateVars = {
    user: users[userID],
  }
  res.render("register", templateVars);
});

//**CONSOLE LOG PRINTING TWICE FOR SOME REASON */
//New user - registers ID, sets cookie, adds to database
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  const foundUser = findUserByEmail(email);

  if (foundUser) {
    res.status(400).send('Email already registered. Log in please!')
    //console.log(users);
  }

  if (email && password && !foundUser) {
    const id = generateRandomString();
    users[id] = {
      id,
      email,
      password
    };
    //console.log(users);
    res.cookie("user_id", id)
    res.redirect("/urls");
  } else {
    //console.log(users);
    res.status(400).send('Please input an email address')
  }
});

//takes in info from registration input, renders to register.ejs
app.get("/urls", (req, res) => {
  userID = req.cookies['user_id']
  const templateVars = {
    urls: urlDatabase,
    user: users[userID]
  };
  res.render("urls_index", templateVars);
});

//
app.post("/urls", (req, res) => {
  let longURL = req.body["longURL"];
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = longURL;
  res.redirect(`/urls/${shortURL}`);
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

app.get("/urls/new", (req, res) => {
  userID = req.cookies['user_id']
  const templateVars = {
    user: users[userID],
  }
  res.render("urls_new", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
  userID = req.cookies['user_id']
  const templateVars = {
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL],
    user: users[userID]
  };
  res.render("urls_show", templateVars);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.post('/urls/:shortURL', (req, res) => {
  const shortURL = req.params.shortURL;
  const longURLContent = req.body.longURLContent;
  updateUrlDatabase(shortURL, longURLContent);
  res.redirect('/urls');
});

app.post("/urls/:shortURL/delete", (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect("/urls");
});



app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

