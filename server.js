if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
const methodOverride = require("method-override");
const cookieParser = require("cookie-parser");
const { OAuth2Client } = require("google-auth-library");
const CLIENT_ID =
  "23169402327-cqsqru72gsbobpo6udf4aha6j2ihpah6.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);

const initializePassport = require("./passport-config");
initializePassport(
  passport,
  (email) => users.find((user) => user.email === email),
  (id) => users.find((user) => user.id === id)
);

const users = [];

app.set("view-engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride("_method"));
app.use(express.json());
app.use(cookieParser());

app.get("/welcome", checkAuthenticated, (req, res) => {
  res.render("welcome.ejs", { name: req.user.name, isLoggedIn: req.isLogged });
});

app.get("/", checkNotAuthenticated, (req, res) => {
  res.render("index.ejs", { isLoggedIn: false });
});

app.get("/login", checkNotAuthenticated, (req, res) => {
  res.render("login.ejs");
});

app.post("/login_g_auth", (req, res) => {
  let token = req.body.token;
  //console.log(token);
  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
      // Or, if multiple clients access the backend:
      //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });
    const payload = ticket.getPayload();
    const userid = payload["sub"];
    //console.log(payload);
    //console.log(userid);
    if (!users.includes(userid)) {
      users.push({
        id: userid,
        name: payload["name"],
        email: payload["email"],
        type: "GSign-in",
      });
      //console.log(users);
    }

    // If request specified a G Suite domain:
    // const domain = payload['hd'];
  }
  verify()
    .then(() => {
      res.cookie("session-token", token);
      res.send("success");
    })
    .catch(console.error);
});

app.get("/protectedRoute", checkAuthenticated, (req, res) => {
  res.send("This route is protected");
});

app.get("/back", checkNotAuthenticated, (req, res) => {
  res.render("back.ejs", { isLoggedIn: false });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/welcome",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

app.get("/register", checkNotAuthenticated, (req, res) => {
  res.render("register.ejs");
});

app.get("/play", checkAuthenticated, (req, res) => {
  res.render("play.ejs", { name: req.user.name, isLoggedIn: req.isLogged });
});

app.post("/register", checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    users.push({
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
    });
    res.redirect("/login");
  } catch {
    res.redirect("/register");
  }
  //console.log(users);
});

app.delete("/logout", (req, res) => {
  req.logOut();
  res.clearCookie("session-token");
  res.redirect("/");
});

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    req.isLogged = true;

    return next();
  }
  let token = req.cookies["session-token"];
  let user = {};
  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
    });
    const payload = ticket.getPayload();
    user.name = payload.name;
    user.email = payload.email;
    user.picture = payload.picture;
  }
  verify()
    .then(() => {
      req.user = user;
      req.isLogged = true;
      next();
    })
    .catch((err) => {
      res.redirect("/login");
    });

  //res.redirect("/index_2");
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }
  next();
}


/********************************************************************
* ABOUT CHESS NOW
*/

var server = require("http").Server(app);
var PEOPLEALLOWED = 2;
var peopleinroom = 3;
current_room = "abc123";
io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

function make_room(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

io.on("connection", function (socket) {
  socket.emit("announcements", { message: "A new user has joined!" });
  socket.on("room", function () {
    if (peopleinroom < PEOPLEALLOWED) {
      socket.join(current_room);
      peopleinroom += 1;
      io.to(current_room).emit("message", "Play now");
      io.to(current_room).emit("play", { room: current_room, id: socket.id });
      socket.emit("flip", "flip the board");

      //console.log(current_room + ": current Client Connected");
    } else {
      new_room = make_room(6);
      socket.join(new_room);
      peopleinroom = 1;
      //console.log(new_room + ": Client Connected");
      io.to(new_room).emit("message", "Wait for second user");
      io.to(new_room).emit("wait", "waiting");
      socket.emit("newroom", { room: new_room, id: socket.id });
      current_room = new_room;
    }

    //console.log(socket.rooms);
  });
  room = "abc123";
  socket.on("mymove", function (data) {
    io.sockets.in(data.room).emit("new_move", { msg: data.message });
    //console.log(data);
    socket
      .to(data.room)
      .emit("your_move", { their_move: data.move, from: data.id });
  });
  socket.to("foobar").emit("message", "anyone in this room yet?");
  //console.log(socket.rooms);
});

server.listen(3000);



//app.listen(3000);
