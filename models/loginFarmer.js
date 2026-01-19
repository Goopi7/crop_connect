const mongoose=require("mongoose");
let Schema=mongoose.Schema;
const passportLocalMongoose=require("passport-local-mongoose");
let farmerSchema=new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true//username and password are inbuilt in passport
    },
    location:{
        type:String,
        required:true
    },
    razorpayMeUsername:{
        type:String,
        trim:true,
        default:null
    },
    phone:{
        type:String,
        trim:true
    },
    bankAccount:{
        accountNumber:String,
        ifscCode:String,
        bankName:String
    }
});
farmerSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model("FarmerLogin",farmerSchema);
