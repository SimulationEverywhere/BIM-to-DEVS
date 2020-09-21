const {OAuth} = require('./common/oauth')
const express = require('express')
const request = require('request')
const request_promise = require('request-promise')
const os = require('os')
const fs = require('fs')
const path = require('path')
const sqlite = require('sqlite-async')
const readline = require('readline')
const OBJFile = require('obj-file-parser')
const colors = require('colors')
const util = require("util");
const fsp = fs.promises


const catchall = function(x) {
    console.log("Bad promise")
    console.log(x.toString())
    console.log()
    console.log(JSON.stringify(x))
}

let router = express.Router();

router.get('/extract', async (req, res, next) => {
    const query = req.query
    var   cats  = []
    if(query.catagories){
        cats = JSON.parse(query.catagories)
    }
    const urn = query.urn
    const oauth = new OAuth(req.session)
    const internalToken = await oauth.getInternalToken()
    //const internalToken = await OAuth.getInternalToken()
    const auth_header = {'Authorization':'Bearer '+internalToken.access_token}

    console.log("urn: "+urn)
    var designdata_metadata = JSON.parse(await request_promise({url:"https://developer.api.autodesk.com/modelderivative/v2/designdata/"+urn+"/metadata", headers:auth_header}))
    var view_metadata = designdata_metadata.data.metadata.find(x => x.name.includes(query.view_name || "3D"))

    if(!view_metadata) throw("Metadata with "+view_name+"not found, did you want "+JSON.stringify(designdata_metadata.data.metadata)  );
    var guid = view_metadata.guid

    //If there are sql query strings in the request, add the ids that they select for in order to the end of the list of catagories
    if(query.sql && query.sql.length){
        let db_url = "https://developer.api.autodesk.com/derivativeservice/v2/derivatives/"+encodeURIComponent("urn:adsk.viewing:fs.file:"+urn)+"/output/Resource/model.sdb"
        let db_blob_p = request_promise({url:db_url, headers:auth_header, encoding:null})
        let db_path = path.join((await (fsp.mkdtemp(path.join(os.tmpdir(), urn+"-")))), "mode.sdb")
        await fsp.writeFile(db_path, (await db_blob_p))
        let db = await sqlite.open(db_path, sqlite.OPEN_READONLY)
        let qp = (await Promise.all(query.sql.map(async (part) => {
            return await db.all(part).then(x => x.map(y => y.id))
        }))).forEach(part => cats.push(part))
        db.close()
    }

    console.log("id lists:")
    console.log(cats)

    //
    const post_retry_on_fail = async(options, max_retries = 5) => {
        request_promise.post(options).catch((x)=>{
            if(max_retries > 0){
                return post_retry_on_fail(options, max_retries-1)
            }else{
                return catchall(x)
            }
        })
    }

    //Send off the jobs
    await Promise.all(cats.filter((cat, index, arr) => {cat.length > 0 && arr.indexOf(cat) === index}).map(async (cat) => {
        return await post_retry_on_fail({
            url:"https://developer.api.autodesk.com/modelderivative/v2/designdata/job",
            body:JSON.stringify(
                {
                    input:{"urn":urn},
                    output:{
                        destination:{region:"us"},
                        formats: [
                            {
                                type: "obj",
                                advanced: {
                                    unit:"meter",
                                    modelGuid:guid,
                                    objectIds:cat
                                }
                            }
                        ]
                    }
                }
            ),
            headers:Object.assign({}, auth_header, {"Content-Type":"application/json; charset=utf-8"})
        })
    }))

    let options = {url:"https://developer.api.autodesk.com/modelderivative/v2/designdata/"+urn+"/manifest", headers:auth_header}
    let manifest_body = null
    while(!manifest_body || ["inprogress","pending"].includes(JSON.parse(manifest_body).status)){
        if(manifest_body){console.log(JSON.parse(manifest_body).status)}
        manifest_body = await request_promise(options).catch(catchall)
    }
    let derivatives = JSON.parse(manifest_body).derivatives
    //console.log()
    //console.log(JSON.parse(manifest_body))
    //console.log()

    const set_identity = ((l1, l2) => {
        l1 = l1.filter((v,i,arr) => arr.indexOf(v) === i)
        l2 = l2.filter((v,i,arr) => arr.indexOf(v) === i)
        if(l1.length !== l2.length) {
            return false
        }else{
            l1.sort((a,b)=>a-b)
            l2.sort((a,b)=>a-b)
            for(var i = 0; i<l1.length; i++){
                if(l1[i] !== l2[i]){
                    return false
                }
            }
            return true
        }
    })

    //console.log(derivatives)
    let obj_manifest = derivatives.find(x => (x.outputType && x.outputType === "obj"))
    if(!obj_manifest) throw("There are no obj files, try again?");

    //console.log(obj_manifest)

    let obj_file_urns = cats.map((cat, i) => {
        if(cat.length <= 0){
            return null
        }else{
            for(index in obj_manifest.children){
                if(set_identity(obj_manifest.children[index].objectIds, cat)){
                    return obj_manifest.children[index].urn
                }
            }
            console.log("No exact match for "+i+" looking for the obj with the most matches without having any extras next")
            return obj_manifest.children[
                obj_manifest.children.map((child, index) => {
                    return child.objectIds.reduce((acc, id) => {
                        if(cat.includes(id)){
                            return [acc[0], acc[1]+1, acc[2]]
                        }else{
                            return [acc[0], acc[1], acc[2]+1]
                        }

                    }, [index, 0,0])
                }).reduce((acc, cur) => {
                    if(cur[2] == 0 && cur[1] > acc[1]){
                        return cur
                    }else{
                        return acc
                    }
                })[0]
                ].urn
            //throw("no obj file for these ids: "+JSON.stringify(cat))
        }

    })

    console.log("obj file urns")
    console.log(obj_file_urns)

    const obj_file_strip = ((objf) => {
        out_faces = []
        objf.models.forEach((model) => {
            model.faces.forEach((face) => {
                out_faces.push(face.vertices.map((vert) => {
                    let v = model.vertices[vert.vertexIndex-1]
                    return [v.x, v.y, v.z]
                }))
            })
        })
        return out_faces
    })

    obj_files = await Promise.all(
        obj_file_urns.map((urn) => {
            if(urn){
                return request_promise(
                    {
                        url:"https://developer.api.autodesk.com/derivativeservice/v2/derivatives/"+urn.split('/').map(x => encodeURIComponent(x)).join('/'),
                        headers:auth_header
                    })
                    .then(async (value) => (obj_file_strip(new OBJFile(value).parse())))
            }else{
                return urn
            }
            }))
    res.send(
        handle_obj_file(obj_files)
    )
})


function handle_obj_file(obj_list){
    const cell_size = [0.25, 0.25, 0.25]
    const cell_half_size = cell_size.map(c => c/2)


    const x_to_cell = (x => Math.floor(x/cell_size[0]))
    const y_to_cell = (y => Math.floor(y/cell_size[1]))
    const z_to_cell = (z => Math.floor(z/cell_size[2]))

    //First, make bounding box
    var max_x = -Infinity
    var max_y = -Infinity
    var max_z = -Infinity

    var min_x = Infinity
    var min_y = Infinity
    var min_z = Infinity

    //console.log(obj_list[0])

    obj_list.filter(obj => obj).forEach(obj => obj.forEach(face => face.forEach(vert => {
        max_x = Math.max(vert[0], max_x)
        max_y = Math.max(vert[1], max_y)
        max_z = Math.max(vert[2], max_z)

        min_x = Math.min(vert[0], min_x)
        min_y = Math.min(vert[1], min_y)
        min_z = Math.min(vert[2], min_z)
    })))

    console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^")

    const x_off = -x_to_cell(min_x)+2
    const y_off = -y_to_cell(min_y)+2
    const z_off = -z_to_cell(min_z)+2

    const to_x = (x => x_to_cell(x)+x_off)
    const to_y = (y => y_to_cell(y)+y_off)
    const to_z = (z => z_to_cell(z)+z_off)

    //to the middle of the pocket of space that maps to this cell
    const from_x = (x_cell => (x_cell-x_off+0.5)*cell_size[0])
    const from_y = (y_cell => (y_cell-y_off+0.5)*cell_size[1])
    const from_z = (z_cell => (z_cell-z_off+0.5)*cell_size[2])

    const x_len = to_x(max_x)+2
    const y_len = to_y(max_y)+2
    const z_len = to_z(max_z)+2

    console.log([x_len, y_len, z_len])
    //is wall, flooded by wall, is door, flooded by door, is window, flooded by window
    var space = []
    for(var i = 0; i<x_len; i++){
        space.push([])
        for(var j = 0; j<y_len; j++){
            space[i].push(Array.apply(null, Array(z_len)).map(Number.prototype.valueOf,0))
        }
    }

    for(index in obj_list){
        if(obj_list[index]){
            console.log(index)
            //console.log(JSON.stringify(obj_list[index]))
            obj_list[index].forEach((face) => {
                min_x = Math.min(face[0][0], face[1][0], face[2][0])
                min_y = Math.min(face[0][1], face[1][1], face[2][1])
                min_z = Math.min(face[0][2], face[1][2], face[2][2])

                max_x = Math.max(face[0][0], face[1][0], face[2][0])
                max_y = Math.max(face[0][1], face[1][1], face[2][1])
                max_z = Math.max(face[0][2], face[1][2], face[2][2])

                for(var x = to_x(min_x)-1; x < to_x(max_x)+2; x++){
                    for(var y = to_y(min_y)-1; y < to_y(max_y)+2; y++){
                        for(var z = to_z(min_z)-1; z < to_z(max_z)+2; z++){
                            space[x][y][z] |= (+triBoxOverlap([from_x(x), from_y(y), from_z(z)], cell_half_size, face))<<index
                        }
                    }
                }
            })
        }
    }

    return {offset:[x_off, y_off, z_off], space:space}
}
function planeBoxOverlap(normal, vert, maxbox) {
  var vmin = [0,0,0]
  var vmax = [0,0,0]

  for (var q = 0; q <= 2; q++) {
    var v = vert[q]
    if (normal[q] > 0) {
      vmin[q] = -maxbox[q] - v
      vmax[q] = maxbox[q] - v
    }else{
      vmin[q] = maxbox[q] - v
      vmax[q] = -maxbox[q] - v
    }
  }
  if ((normal[0] * vmin[0] + normal[1] * vmin[1] + normal[2] * vmin[2]) > 0){
    return false
  }else if ((normal[0] * vmax[0] + normal[1] * vmax[1] + normal[2] * vmax[2]) >= 0){
    return true
  }else{
    return false
  }
}


/*
 * boxcenter is an array of 3 numbers, [x, y, z] representing the center of the cell
 *
 * boxhalfsize is an array of 3 numbers, [x_length/2, y_length/2, z_length/2] representing the side lengths of the cell, halved.
 *
 * triverts is an array of 3 arrays of numbers, [[ax, ay, az], [bx, by, bz], [cx, cy, cz]] representing the 3 vertexes of the triangle a, b, and c
 *
 */
function triBoxOverlap(boxcenter, boxhalfsize, triverts) {
  var v0 = [0,0,0]
  var v1 = [0,0,0]
  var v2 = [0,0,0]

  var min, max, p0, p1, p2, rad, fex, fey, fez

  var normal = [0,0,0]
  var e0 = [0,0,0]
  var e1 = [0,0,0]
  var e2 = [0,0,0]

  v0[0] = triverts[0][0] - boxcenter[0]
  v0[1] = triverts[0][1] - boxcenter[1]
  v0[2] = triverts[0][2] - boxcenter[2]

  v1[0] = triverts[1][0] - boxcenter[0]
  v1[1] = triverts[1][1] - boxcenter[1]
  v1[2] = triverts[1][2] - boxcenter[2]

  v2[0] = triverts[2][0] - boxcenter[0]
  v2[1] = triverts[2][1] - boxcenter[1]
  v2[2] = triverts[2][2] - boxcenter[2]


  e0[0] = v1[0] - v0[0]
  e0[1] = v1[1] - v0[1]
  e0[2] = v1[2] - v0[2]

  e1[0] = v2[0] - v1[0]
  e1[1] = v2[1] - v1[1]
  e1[2] = v2[2] - v1[2]

  e2[0] = v0[0] - v2[0]
  e2[1] = v0[1] - v2[1]
  e2[2] = v0[2] - v2[2]

  fex = Math.abs(e0[0])
  fey = Math.abs(e0[1])
  fez = Math.abs(e0[2])
  p0 = e0[2] * v0[1] - e0[1] * v0[2]
  p2 = e0[2] * v2[1] - e0[1] * v2[2]
  if (p0 < p2) {
    min = p0
    max = p2
  } else {
    min = p2
    max = p0
  }
  rad = fez * boxhalfsize[1] + fey * boxhalfsize[2]
  if (min > rad || max < -rad){
    return false;
  }
  p0 = -e0[2] * v0[0] + e0[0] * v0[2]
  p2 = -e0[2] * v2[0] + e0[0] * v2[2]
  if (p0 < p2) {
    min = p0;
    max = p2;
  } else {
    min = p2;
    max = p0;
  }
  rad = fez * boxhalfsize[0] + fex * boxhalfsize[2]
  if (min > rad || max < -rad){
    return false
  }
  p1 = e0[1] * v1[0] - e0[0] * v1[1]
  p2 = e0[1] * v2[0] - e0[0] * v2[1]
  if (p2 < p1) {
    min = p2
    max = p1
  } else {
    min = p1
    max = p2
  }
  rad = fey * boxhalfsize[0] + fex * boxhalfsize[1]
  if (min > rad || max < -rad){
    return false
  }

  fex = Math.abs(e1[0])
  fey = Math.abs(e1[1])
  fez = Math.abs(e1[2])
  p0 = e1[2] * v0[1] - e1[1] * v0[2]
  p2 = e1[2] * v2[1] - e1[1] * v2[2]
  if (p0 < p2) {
    min = p0
    max = p2
  } else {
    min = p2
    max = p0
  }
  rad = fez * boxhalfsize[1] + fey * boxhalfsize[2]
  if (min > rad || max < -rad){
    return false
  }
  p0 = -e1[2] * v0[0] + e1[0] * v0[2]
  p2 = -e1[2] * v2[0] + e1[0] * v2[2]
  if (p0 < p2) {
    min = p0
    max = p2
  } else {
    min = p2
    max = p0
  }
  rad = fez * boxhalfsize[0] + fex * boxhalfsize[2]
  if (min > rad || max < -rad){
    return false
  }
  p0 = e1[1] * v0[0] - e1[0] * v0[1]
  p1 = e1[1] * v1[0] - e1[0] * v1[1]
  if (p0 < p1) {
    min = p0
    max = p1
  } else {
    min = p1
    max = p0
  }
  rad = fey * boxhalfsize[0] + fex * boxhalfsize[1]
  if (min > rad || max < -rad){
    return false
  }

  fex = Math.abs(e2[0])
  fey = Math.abs(e2[1])
  fez = Math.abs(e2[2])
  p0 = e2[2] * v0[1] - e2[1] * v0[2]
  p1 = e2[2] * v1[1] - e2[1] * v1[2]
  if (p0 < p1) {
    min = p0
    max = p1
  } else {
    min = p1
    max = p0
  }
  rad = fez * boxhalfsize[1] + fey * boxhalfsize[2]
  if (min > rad || max < -rad){
    return false
  }
  p0 = -e2[2] * v0[0] + e2[0] * v0[2]
  p1 = -e2[2] * v1[0] + e2[0] * v1[2]
  if (p0 < p1) {
    min = p0
    max = p1
  } else {
    min = p1
    max = p0
  }
  rad = fez * boxhalfsize[0] + fex * boxhalfsize[2]
  if (min > rad || max < -rad){
    return false
  }
  p1 = e2[1] * v1[0] - e2[0] * v1[1]
  p2 = e2[1] * v2[0] - e2[0] * v2[1]
  if (p2 < p1) {
    min = p2
    max = p1
  } else {
    min = p1
    max = p2
  }
  rad = fey * boxhalfsize[0] + fex * boxhalfsize[1]
  if (min > rad || max < -rad){
    return false
  }
  min = max = v0[0]
  if (v1[0] < min){
    min = v1[0]
  }
  if (v1[0] > max){
    max = v1[0]
  }
  if (v2[0] < min){
    min = v2[0]
  }
  if (v2[0] > max){
    max = v2[0]
  }
  if (min > boxhalfsize[0] || max < -boxhalfsize[0]){
    return false
  }
  min = max = v0[1]
  if (v1[1] < min){
    min = v1[1]
  }
  if (v1[1] > max){
    max = v1[1]
  }
  if (v2[1] < min){
    min = v2[1]
  }
  if (v2[1] > max){
    max = v2[1]
  }

  if (min > boxhalfsize[1] || max < -boxhalfsize[1]){
    return false
  }
  min = max = v0[2]
  if (v1[2] < min){
    min = v1[2]
  }
  if (v1[2] > max){
    max = v1[2]
  }
  if (v2[2] < min){
    min = v2[2]
  }
  if (v2[2] > max){
    max = v2[2]
  }
  if (min > boxhalfsize[2] || max < -boxhalfsize[2]){
    return false
  }
  normal[0] = e0[1] * e1[2] - e0[2] * e1[1]
  normal[1] = e0[2] * e1[0] - e0[0] * e1[2]
  normal[2] = e0[0] * e1[1] - e0[1] * e1[0]


  if (!planeBoxOverlap(normal, v0, boxhalfsize)){
    return false
  }

  return true
}

module.exports = router;
