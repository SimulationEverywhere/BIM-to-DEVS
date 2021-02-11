const fs = require("fs")
const path = require("path")

const express = require("express");
const { json } = require("express");
const { type } = require("os");

let router = express.Router();

router.get("/files",(req,res,next)=>{

    const files = [];
    files.push(req.query.jsonFile);
    files.push(req.query.txtFile);

    var type;
    var Files = [];
    //var type;
    for (let file of files) {

     var temp = fs.readFileSync(file, "utf8");

        const result = path.extname(file).split('.')[1];
        if (result == 'json' || result == json) {
             type = "application/json"
        }
        else if (result == 'txt' || result == txt) {
             type = "text/plain"
        }
        var name = path.basename(file);
        var size = fs.statSync(file).size;
        Files.push({ "type":type, "size":size, "name":name, "content": temp });
        //Files.push(obj)   
   }
   res.send(Files);
   console.log(Files)
});

module.exports = router;