const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs')
const User = require('../routes/Users/model/User')



passport.serializeUser((user,done)=>{
  done(null,user._id)
})

passport.deserializeUser((id,done)=>{
  User.findById(id,(err,user)=>{
    done(err,user);
  })
});

passport.use('local-login', 
new LocalStrategy({
  usernameField:'email',
  passwordField: 'password',
  passReqToCallback:true
}, (req,username,password,done)=>{
  User.findOne({username},(err,user)=>{
  if(err){
    return done(err,null)
  }if(!user){
    return done(null,false,req.flash('errors','user not found'))
//   }else if(user.defaultPassword === true){
//     return done(null,false,
//         req.flash('errors', ""))
}

  bcrypt.compare(password,user.password).then((result)=>{
    if(!result){
      return done(null,false,req.flash('errors','check user and password'))
    }else{
      return done(null,user)
    }
  }).catch((error)=>{
    return done(error,null);
  })
  })
}
)
)