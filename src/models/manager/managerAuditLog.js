const mongoose = require("mongoose")

const actionlogSchema = new mongoose.Schema({
    userId:{type:monggose.Schema.Types.ObjectId,ref:"User"},
    action:{type:String,required:true},
    entity:{type:String,required:true},
    message:{type:String,required:true},
    entityId:{type:monggose.Schema.Types.ObjectId,ref:"User"},
},
{timestamps:true}
)

module.exports = mongoose.model(("ActionLog",actionlogSchema ))