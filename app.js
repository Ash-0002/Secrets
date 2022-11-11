require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
// const bcrypt = require("bcrypt"); -------> used for hashing password
// const saltRounds = 10;


const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB", { useNewUrlParser: true });

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
}); // It's a schema created with using mongoose Schema class( no longer a simple javaScript object)

// ------ used this plugin with MONGOOSE-ENCRYPTION PACKAGE
// userSchema.plugin(encrypt, {
//     secret: process.env.SECRET,
//     encryptedFields: ["password"],
// });  

userSchema.plugin(passportLocalMongoose);// using this for Hash and salt our passwords and to save our users into the MongoDB database.
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));

app.get("/login", function (req, res) {
    res.render("login");
});

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}}, function(err, foundUsers){
        if(err){
            console.log(err);
        }else{
            if(foundUsers){
                res.render("secrets", {userWithSecrets : foundUsers});
            }
        }
    });
});


app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
    
    User.findById(req.user.id, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    });
});

app.get("/logout", function(req, res){
    req.logout(function(err){
        if(err) { 
            return next(err); 
        }
        res.redirect("/");
    });
});


app.post("/register", function(req, res){
    
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            })
        }
    })
});

app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
});


app.listen(3000, function () {
    console.log("Server started on port 3000");
});








/*-------------CODE WE USED WITH BCRYPT PACKAGE------->
app.post("/register", function (req, res) {
    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
        const newUser = new User({
            email: req.body.username,
            password: hash,
        });
        newUser.save(function (err) {
            if (err) {
                console.log(err);
            } else {
                res.render("secrets");
            }
        });
    });
});

app.post("/login", function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({ email: username }, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                // if(foundUser.password === password){
                //     res.render("secrets");
                // }

                bcrypt.compare(password, foundUser.password, function (err, result) {
                    if (result === true) {
                        res.render("secrets");
                    }
                });
            }
        }
    });
}); 
*/