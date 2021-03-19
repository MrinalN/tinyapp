
//used in POST /register && POST /login
const findUserByEmail = (email, database) => {
  for (let user in database) {
    const userObj = database[user];
    if (userObj.email === email) {
      // if found return the user. Formatted like full user database.
      return userObj;
    }
  }
  // if not found return false
  return false;
};

module.exports = {findUserByEmail};