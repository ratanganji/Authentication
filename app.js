const express = require("express");

const app = express();

const path = require("path");

const dbPath = path.join(__dirname, "userData.db");

const sqlite3 = require("sqlite3");

const { open } = require("sqlite");

let db = null;

const bcrypt = require("bcrypt");

app.use(express.json());

const intializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("server is running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`db error: ${error.message}`);
    process.exit(1);
  }
};

intializeDBandServer();

const validatePassword = (password) => {
  return password.length > 4;
};

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;

  const hashedPassword = await bcrypt.hash(request.body.password, 10);

  const selectUserQuery = `
  SELECT * 
  FROM user
  WHERE username = '${username}';`;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    const createUserQuery = ` 
INSERT INTO user
(username, name, password, gender, location )
VALUES ('${username}',
'${name}',
'${hashedPassword}',
'${gender}',
'${location}'
);`;

    if (validatePassword(password)) {
      const dbResponse = await db.run(createUserQuery);

      const dbUserId = dbResponse.lastID;
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const selectUserQuery = `
  SELECT * 
  FROM user
  WHERE username = '${username}';`;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === false) {
      response.status(400);
      response.send("Invalid password");
    } else {
      response.status(200);
      response.send("Login success!");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  const selectUserQuery = `
  SELECT * 
  FROM user
  WHERE username = '${username}';`;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );

    if (isPasswordMatched === true) {
      if (validatePassword(newPassword)) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
            UPDATE user
            SET password = '${hashedPassword}'
            WHERE username = '${username}';`;

        const user = await db.run(updatePasswordQuery);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
