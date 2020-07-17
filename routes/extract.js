const { OAuth } = require('./common/oauth')
const express = require('express')
const request = require('request')
const request_promise = require('request-promise')
const os = require('os')
const fs = require('fs')
const path = require('path')
const sqlite3 = require('sqlite3')
const readline = require('readline');

let router = express.Router();

const view_name = "3D"

const sql_query_walls = (
    'SELECT DISTINCT '+
    '    _objects_id.id AS id '+
    'FROM '+
    '    _objects_attr '+
    '     INNER JOIN _objects_eav ON _objects_eav.attribute_id = _objects_attr.id '+
    '     LEFT OUTER JOIN _objects_val ON _objects_eav.value_id = _objects_val.id '+
    '     LEFT OUTER JOIN _objects_id ON _objects_eav.entity_id = _objects_id.id '+
    'WHERE '+
    '     _objects_attr.category = "Category" AND '+
    '     _objects_val.value = "Revit Walls";');


const sql_query_windows =(
    'SELECT DISTINCT '+
    '    _objects_id.id AS id '+
    'FROM '+
    '    _objects_attr '+
    '     INNER JOIN _objects_eav ON _objects_eav.attribute_id = _objects_attr.id '+
    '     LEFT OUTER JOIN _objects_val ON _objects_eav.value_id = _objects_val.id '+
    '     LEFT OUTER JOIN _objects_id ON _objects_eav.entity_id = _objects_id.id '+
    'WHERE '+
    '     _objects_attr.category = "Category" AND '+
    '     _objects_val.value = "Revit Windows";');

const sql_query_doors =(
    'SELECT DISTINCT '+
    '    _objects_id.id AS id '+
    'FROM '+
    '    _objects_attr '+
    '     INNER JOIN _objects_eav ON _objects_eav.attribute_id = _objects_attr.id '+
    '     LEFT OUTER JOIN _objects_val ON _objects_eav.value_id = _objects_val.id '+
    '     LEFT OUTER JOIN _objects_id ON _objects_eav.entity_id = _objects_id.id '+
    'WHERE '+
    '     _objects_attr.category = "Category" AND '+
    '     _objects_val.value = "Revit Doors";');




router.get('/extract', async (req, res, next) => {
    const urn = req.query.urn

    const oauth = new OAuth(req.session)
    const internalToken = await oauth.getInternalToken()
    const auth_header = {'Authorization':'Bearer '+internalToken.access_token}

    request({url:"https://developer.api.autodesk.com/modelderivative/v2/designdata/"+urn+"/metadata", headers:auth_header}, (error, responce, body) => { if(error) throw(error);
        console.log(urn)
        console.log(body)
        var view_metadata = JSON.parse(body).data.metadata.find(x => x.name.includes(view_name))
        if(!view_metadata) throw("Metadata with "+view_name+"not found, did you want "+JSON.stringify(JSON.parse(body).data.metadata)  );
        var guid = view_metadata.guid
        //console.log(guid)
        var t_url = "https://developer.api.autodesk.com/derivativeservice/v2/derivatives/"+encodeURIComponent("urn:adsk.viewing:fs.file:"+urn)+"/output/Resource/model.sdb"
        //console.log(t_url)
        request({url:t_url, headers:auth_header, encoding:null}, (error, response, body) => { if (error) throw(error);
            fs.mkdtemp(path.join(os.tmpdir(), urn+"-"), (err, directory) => { if(err) throw err;
                var db_path = path.join(directory, "model.sdb")
                fs.writeFile(db_path, body, (err) => {if (err) throw err;
                    let db = new sqlite3.Database(db_path, sqlite3.OPEN_READONLY, (err) => {if (err) throw err;
                        db.all(sql_query_walls, [], (err, wall_rows) => {if (err) throw err;
                            db.all(sql_query_windows, [], (err, window_rows) => {if (err) throw err;
                                db.all(sql_query_doors, [], (err, door_rows) => {if (err) throw err;
                                    //console.log("walls "+wall_rows.map(x => x.id))
                                    //console.log("windows "+window_rows.map(x => x.id))
                                    //console.log("door "+door_rows.map(x => x.id))
                                    var all_ids = wall_rows.map(x => x.id).concat(window_rows.map(x => x.id)).concat(door_rows.map(x => x.id)).sort((a, b) => (a-b))

                                    var data = {
                                        input:{"urn":urn},
                                        output:{
                                            destination:{region:"us"},
                                            formats: [
                                                {
                                                    type: "obj",
                                                    advanced: {
                                                        unit:"meter",
                                                        modelGuid:guid,
                                                        objectIds: wall_rows.map(x => x.id).concat(window_rows.map(x => x.id)).concat(door_rows.map(x => x.id))
                                                    }
                                                }
                                            ]}
                                        };
                                    //console.log(JSON.stringify(data))
                                    //console.log(Object.assign({}, auth_header, {"Content-Type":"application/json; charset=utf-8"}))
                                    request.post({  url:"https://developer.api.autodesk.com/modelderivative/v2/designdata/job",
                                                    body:JSON.stringify(data),
                                                    headers:Object.assign({}, auth_header, {"Content-Type":"application/json; charset=utf-8"})},
                                            (error, response, body)=>{
                                        if(error) throw(error);
                                        //console.log(body)
                                        var options = {url:"https://developer.api.autodesk.com/modelderivative/v2/designdata/"+urn+"/manifest", headers:auth_header}
                                        request(options, async (error, response, body)=>{if(error) throw(error);
                                            console.log()
                                            console.log(body)
                                            while(["inprogress","pending"].includes(JSON.parse(body).status)){
                                            //if(true){"status":"pending"
                                                console.log(JSON.parse(body).status)
                                                body = await request_promise(options)
                                                //console.log(result_value)
                                                //return
                                            }


                                            var obj_manifest = JSON.parse(body).derivatives.find(
                                                x => (
                                                    x &&
                                                    x.outputType == "obj" &&
                                                    x.children &&
                                                    x.children.length >= 2 &&
                                                    x.children[0].objectIds &&
                                                    x.children[0].objectIds.every(x => all_ids.includes(x))
                                                )
                                            )
                                            if(!obj_manifest) throw("There is no obj file, try again?");
                                            var obj_urn = obj_manifest.children.find(x => x.urn.endsWith(".obj")).urn
                                            var mtl_urn = obj_manifest.children.find(x => x.urn.endsWith(".mtl")).urn
                                            if(!obj_urn || !mtl_urn)throw("One or more of the files are missing, try again?");

                                            request({url:"https://developer.api.autodesk.com/derivativeservice/v2/derivatives/"+obj_urn.split('/').map(x => encodeURIComponent(x)).join('/'),
                                                    headers:auth_header, encoding:null}, (error, response, body) => { if (error) throw(error);
                                                var obj_path = path.join(directory, "model.obj")
                                                fs.writeFile(obj_path, body, (err) => {if (err) throw err;
                                                    request({url:"https://developer.api.autodesk.com/derivativeservice/v2/derivatives/"+mtl_urn.split('/').map(x => encodeURIComponent(x)).join('/'),
                                                            headers:auth_header, encoding:null}, (error, response, body) => { if (error) throw(error);
                                                        var mtl_path = path.join(directory, "model.mtl")
                                                        fs.writeFile(mtl_path, body, (err) => {if (err) throw err;
                                                            handle_obj_file(obj_path, mtl_path, db_path, wall_rows, window_rows, door_rows)
                                                        })
                                                    })
                                                })
                                            })
                                        })
                                    })
                                })
                            })
                        })
                        db.close()
                    })
                })
            })
        })
    })
    res.send("hello world")
})


function handle_obj_file(obj_path, mtl_path, sqlite_path, wall_rows, window_rows, door_rows){
    const readInterface = readline.createInterface({
        input: fs.createReadStream(obj_path),
        output: process.stdout,
        console: false
    });
}


module.exports = router;
