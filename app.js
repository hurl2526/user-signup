const express = require('express');
const app = express();
const morgan = require('morgan');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const flash = require('connect-flash');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const passport = require('passport');
let MongoStore = require('connect-mongo')(session);
const { nanoid }=require('nanoid/non-secure')
// const { check, validationResult } = require('express-validator');
const User = require('./routes/Users/model/User');

const mailjet = require('node-mailjet').connect(
  '26d48b3bd10ea6991d9da1b7e2530851',
  '3915bd64f50ba90c81d666b33a1b0295'
);

// import { nanoid } from 'nanoid'
// model.id = nanoid()

require('dotenv').config();
require('./lib/passport');
const port = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.log(`MongoDB Error: ${err}`));

//App.sets-----------------------------

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//App.uses-----------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET,
    store: new MongoStore({
      url: process.env.MONGODB_URI,
      mongooseConnection: mongoose.connection,
      autoReconnect: true,
    }),
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());


//a way to pass variables to every page in ejs by using res.locals.sends stuff to view
// res.locals.variableName
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.errors = req.flash('errors');
  res.locals.success = req.flash('success');

  next();
});

//Making sure the user can view certain pages only if they are logged in----
const auth = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect('/no');
  }
};

//ALL GET Routes----------------------------

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/app', auth, (req, res, next) => {
  res.render('app');
});

app.get('/login/:username', (req, res) => {
  User.findOne({ username: req.params.username }).then((user) => {
    if (user.allowed) {
      req.flash('errors', 'Password changed');
      return res.render('/no');
    }
    return res.render('login');
  });
});

app.get('/no', (req, res) => {
  res.render('no');
});
app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/logout', (req, res) => {
  req.logout();
  req.flash('success', 'you are now logged out');
  res.redirect('/');
});

//Verify data is correct format----------------------------
// const loginCheck = [
//   check('email').isEmail(),
//   check('password').isLength({ min: 3 }),
// ];
// const loginValidate = (req, res, next) => {
//   const info = validationResult(req);
//   if (!info.isEmpty()) {
//     req.flash('errors', 'Invalid email or Password');
//     return res.redirect('/login');
//   }
//   next();
// };
// const registerValidate = (req, res, next) => {
//   const info = validationResult(req);
//   if (!info.isEmpty()) {
//     req.flash('errors', 'Invalid email or Password');
//     return res.redirect('/register');
//   }
//   next();
// };

//ALL Post Routes----------------------------

app.post(
  '/login',
  passport.authenticate('local-login', {
    successRedirect: '/app',
    failureRedirect: '/login',
    failureFlash: true,
  })
);

app.post('/', (req, res) => {
  User.findOne({ email: req.body.email }).then((user) => {
    if (user) {
      // return res.status(400).json({ message: 'User Exists' });
      req.flash('errors', 'account exists');
      return res.redirect(301, '/');
    } else {
      // const salt = bcrypt.genSaltSync(10);
      // const hash = bcrypt.hashSync(req.body.password, salt);

      let newUser = new User();
      let uniqueID = nanoid()
      newUser.username = req.body.username;
      newUser.name = req.body.name;
      newUser.email = req.body.email;
      newUser.password= uniqueID;
      newUser.address.number = req.body.number;
      newUser.address.city = req.body.city;
      newUser.address.state = req.body.state;
console.log(newUser)
      newUser.save().then((user) => {
        console.log("this is the user",user)
        const request = mailjet.post('send', { version: 'v3.1' }).request({
          Messages: [
            {
              From: {
                Email: 'patrick.hurley@codeimmersives.com',
                Name: 'PATRICK',
              },
              To: [
                {
                  Email: `${user.email}`,
                  Name: `${user.name}`,
                },
              ],
              Subject: "Greetings from Pat'sUserEmailSignupHW.",
              TextPart: 'email',
              HTMLPart: `<h3>Dear ${user.username}, welcome to our app, please use this link <a href='http://localhost:3000/login/${user.username}>EMAILSIGNUPAPP</a>to activate your account.</h3> The temporary password to complete signup is ${user.password}`,
              CustomID: 'AppGettingStartedTest',
            },
          ],
        });
        request
          .then((result) => {
            console.log(result.body);
            req.flash('success', 'Check your email');
            return res.redirect('/');
          })
          .catch((err) => {
            req.flash('failure', 'failed');
            console.log('uhoh');
            return res.redirect('/');
          })

          .catch((err) => {
            console.log(err);
            req.flash('errors', 'Server error');
            return res.redirect('/')
          })
      });
    }
  });
});

app.post('/login/complete', (req, res) => {
  User.findOne({ username: req.params.username }).then((user) => {
    if (!user) {
      req.flash('errors', 'User not found');
      return res.redirect(301, '/login');
    }
    if (user.password !== req.body.temporary) {
      req.flash('errors', 'Wrong temporary password');
      return res.redirect(301, '/login');
    }
    if (req.body.password !== req.body.passwordConfirm) {
      req.flash('errors', 'Not a match');
      return res.redirect(301, '/login');
    } else {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(req.body.password, salt);
      user.password = hash;
      user.allowed = true;
      user.save();
      res.redirect('/app');
    }
  });
});

app.listen(port, () => console.log(`Listening on port ${port}`));
