const mongoose = require('mongoose')
const { nanoid }=require('nanoid/non-secure')




const UserSchema = new mongoose.Schema({
  username:{type:String, lowercase:true,unique:true,required:true},
  name: {type:String,required:true, lowercase:true},
  email:{type:String, lowercase:true,required:true},
  password:{type:String,required:true, min: 3},
  address:{number:{type:String,required:true},city:{type:String,required:true},state:{type:String,required:true}},
  allowed:{type:Boolean,required:true,default:false}
})

  module.exports = mongoose.model('user', UserSchema)