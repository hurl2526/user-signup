const express = require('express')
const app = express()
const morgan = require('morgan')
const mongoose = require('mongoose')
const cookieParser = require('cookie-parser')
const path = require('path')
const flash = require('connect-flash');
const session = require('express-session')
const bcrypt = require('bcryptjs')
const passport = require('passport')
let MongoStore = require('connect-mongo')(session)
const {check,validationResult}= require('express-validator')
const User = require('./model/User')
const axios = require ('axios')
require('dotenv').config()
require('./lib/passport')
const port = process.env.PORT || 3000

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.log(`MongoDB Error: ${err}`))

//App.sets-----------------------------

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname,'views'))

//App.uses-----------------------------

app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.use(express.static(path.join(__dirname,'public')))
app.use(morgan('dev'))
app.use(cookieParser())
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
)

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
app.use((req,res,next)=>{
  console.log('Session', req.session)
  console.log('User:', req.user)
  next()
})

//a way to pass variables to every page in ejs by using res.locals.sends stuff to view
// res.locals.variableName
app.use((req,res,next)=>{
  res.locals.user=req.user
  res.locals.errors = req.flash('errors')
  res.locals.success = req.flash('success')

  next()
})

//Making sure the user can view certain pages only if they are logged in----
const auth = (req,res,next)=>{
  if(req.isAuthenticated()){
    next()
  }else{
    res.redirect('/no')
  }
}

//ALL GET Routes----------------------------


app.get('/', (req, res) => {
  res.render('index')
})

app.get('/movies',auth,(req,res)=>{
  axios.get('https://api.themoviedb.org/3/movie/now_playing?api_key=3321a09fccc3516724f51fea1ce994ab&language=en-US&page=1')
.then(movieData => 
  // console.log(movieData))
  res.render('movies',{movieData}))
.catch(error => console.log(error))
});

app.get('/random',auth,(req,res)=>{
  axios.get('https://randomuser.me/api/?results=20')
.then(data => 
  // console.log(data.data.results))
  res.render('random',{data}))
.catch(error => console.log(error))
  // res.render('random',people)
})

app.get('/no', (req, res) => {
  res.render('no')
})

app.get('/options',auth, (req, res) => {
    res.render('options')
})
app.get('/login', (req, res) => {
    res.render('login')
})

app.get('/register', (req, res) => {
  res.render('register')
})

app.get('/logout',(req,res)=>{
  req.logout();
  req.flash('success', 'you are now options out')
  res.redirect('/login')
})

//Verify data is correct format----------------------------
const loginCheck=[
  check('email').isEmail(),
  check('password').isLength({min:3})
]
const loginValidate = (req,res,next)=>{
  const info = validationResult(req);
  if(!info.isEmpty()){
    req.flash('errors','Invalid email or Password')
    return res.redirect('/login')
  }
  next();
};
const registerValidate = (req,res,next)=>{
  const info = validationResult(req);
  if(!info.isEmpty()){
    req.flash('errors','Invalid email or Password')
    return res.redirect('/register')
  }
  next();
};


//ALL Post Routes----------------------------

app.post('/login',loginCheck,loginValidate,passport.authenticate('local-login',{
  successRedirect:'/options',
  failureRedirect:'/login',
  failureFlash:true
}))


app.post('/register',loginCheck,registerValidate, (req, res) => {
  User.findOne({ email: req.body.email })
  .then((user) => {
    if (user) {
      // return res.status(400).json({ message: 'User Exists' });
      req.flash('errors', 'account exists');
      return res.redirect(301,'/register');
    }else{

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(req.body.password, salt);

    let newUser = new User();
    newUser.name = req.body.name;
    newUser.email = req.body.email;
    newUser.password = hash;

    newUser.save().then((user) => {
        req.login(user,(err)=>{
          if(err){
            res.status(500).json({confirmation:false,message:"server Error"})
          } else{
            return res.redirect('/options')
          }
        })
      })
      .catch((err)=>console.log('error here'))
      }
  })
})




app.listen(port, () => console.log(`Listening on port ${port}`))







