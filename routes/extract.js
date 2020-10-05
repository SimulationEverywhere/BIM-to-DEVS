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

    /* Freeing this*/
    designdata_metadata = null

    var guid = view_metadata.guid

    /* Freeing this*/
    view_metadata = null

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

    //Breake up the catagories into managable lumps
    const segment_size = 200
    var segments = cats.map((cat) => {
            if(cat){
                var arr = []
                for(var index = 0; index*segment_size < cat.length; index++){
                    arr.push(cat.slice(index*segment_size, (index+1)*segment_size))
                }
                return arr
            }else{
                return []
            }
        }).reduce((acc, cur, index)=> {
            cur.forEach(s => acc.push({type:index, ids:s}))
            return acc
        }, [])

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

    console.log("split catagories into "+segments.length+" segments")

    //Send off the jobs
    await Promise.all(segments.map(async (seg) => {
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
                                    objectIds:seg.ids
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

    /* Freeing this*/
    manifest_body = null

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

    /* Freeing this*/
    derivatives = null

    //console.log(obj_manifest)

    let obj_file_urns = segments.map((seg, i) => {
        for(index in obj_manifest.children){
            if(set_identity(obj_manifest.children[index].objectIds, seg.ids)){
                return {type:seg.type, urn:obj_manifest.children[index].urn}
            }
        }
        console.log("No exact match for "+i+" (From class "+seg.type+") looking for the obj with the most matches without having any extras next")
        return {type:seg.type, urn:obj_manifest.children[
            obj_manifest.children.map((child, index) => {
                return child.objectIds.reduce((acc, id) => {
                    if(seg.ids.includes(id)){
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
            ].urn}
        //throw("no obj file for these ids: "+JSON.stringify(cat))
    })

    /* Freeing this*/
    obj_manifest = null

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

    var output = obj_file_urns.reduce((async (space, cur, cur_index, arr) => {
            var obj_file = await request_promise(
                                {
                                    url:"https://developer.api.autodesk.com/derivativeservice/v2/derivatives/"+cur.urn.split('/').map(x => encodeURIComponent(x)).join('/'),
                                    headers:auth_header
                                }).then(async (value) => (obj_file_strip(new OBJFile(value).parse())))
            var true_space = await space
            process.stdout.write("\nWorking... "+(cur_index+1)+"/"+arr.length+" ")
            return handle_obj_file(true_space, obj_file, cur.type)
        })
        , {cell_size:[0.25, 0.25, 0.25], max_type:obj_file_urns.slice(-1)[0].type}
    )

    res.send(await output)
    console.log("\nDone!")
})



function handle_obj_file(space, obj_file, type){


    //console.log('%%%%%%%%%%%%%%%%%%%%')
    //console.log("type: "+type)
    //console.log("face count: "+obj_file.length)
    //console.log("")
    //console.log(space)
    //console.log("")
    process.stdout.write("#")
    const cell_half_size = space.cell_size.map(c => c/2)
    //helper functions
    const space_trunk = ((v) =>
        [
            Math.floor(v[0]/space.cell_size[0]),
            Math.floor(v[1]/space.cell_size[1]),
            Math.floor(v[2]/space.cell_size[2]),
        ])

    const space_to_cell = ((v) => {
        let trunc = space_trunk(v)
        return [
            trunc[0]+space.offset[0],
            trunc[1]+space.offset[1],
            trunc[2]+space.offset[2]
            ]
    })

    const space_to_cell_center = ((c) => [
        (c[0]-space.offset[0]+0.5)*space.cell_size[0],
        (c[1]-space.offset[1]+0.5)*space.cell_size[1],
        (c[2]-space.offset[2]+0.5)*space.cell_size[2]
    ])

    // find bounding box
    var max_x = -Infinity
    var max_y = -Infinity
    var max_z = -Infinity

    var min_x = Infinity
    var min_y = Infinity
    var min_z = Infinity

    obj_file.forEach(
        (face) => {face.map(vert => space_trunk(vert)).forEach((vert) => {
        max_x = Math.max(vert[0], max_x)
        max_y = Math.max(vert[1], max_y)
        max_z = Math.max(vert[2], max_z)

        min_x = Math.min(vert[0], min_x)
        min_y = Math.min(vert[1], min_y)
        min_z = Math.min(vert[2], min_z)
    })})

    //console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^")

    process.stdout.write("#")

    if(!space.offset){
        //first run, set up the cells
        space.min    = [min_x, min_y, min_z]
        space.max    = [max_x, max_y, max_z]
        space.offset = [1-space.min[0], 1-space.min[1], 1-space.min[2]] /* the vector from the true position to the position in space.cells  */
        space.len    = [space.max[0]-space.min[0]+2,
                        space.max[1]-space.min[1]+2,
                        space.max[2]-space.min[2]+2]
        space.cells = []
        for(var x = 0; x<space.len[0]; x++){
            space.cells.push([])
            for(var y = 0; y<space.len[1]; y++){
                space.cells[x].push(Array.apply(null, Array(space.len[2])).map(Number.prototype.valueOf,0))
            }
        }
    }else{
        //not first run, mix in
        //first x
        if(min_x < space.min[0]){
            for(var x = 0; x<space.min[0]-min_x; x++){
                let arr = []
                space.cells.unshift(arr)
                for(var y = 0; y<space.len[1]; y++){
                    arr.push(Array.apply(null, Array(space.len[2])).map(Number.prototype.valueOf,0))
                }
            }
        }

        if(max_x > space.max[0]){
            for(var x = 0; x<max_x-space.max[0]; x++){
                let arr = []
                space.cells.push(arr)
                for(var y = 0; y<space.len[1]; y++){
                    arr.push(Array.apply(null, Array(space.len[2])).map(Number.prototype.valueOf,0))
                }
            }
        }

        //then y
        if(min_y < space.min[1]){
            for(var x in space.cells){
                for(var y = 0; y<space.min[1]-min_y; y++ ){
                    space.cells[x].unshift(Array.apply(null, Array(space.len[2])).map(Number.prototype.valueOf,0))
                }
            }
        }
        if(max_y > space.max[1]){
            for(var x in space.cells){
                for(var y = 0; y<max_y-space.max[1]; y++ ){
                    space.cells[x].push(Array.apply(null, Array(space.len[2])).map(Number.prototype.valueOf,0))
                }
            }
        }

        //then z
        if(min_z < space.min[2]){
            for(var x in space.cells){
                for(var y in space.cells[x]){
                    space.cells[x][y].unshift(...Array.apply(null, Array(space.min[2]-min_z)).map(Number.prototype.valueOf,0))
                }
            }
        }
        if(max_z > space.max[2]){
            for(var x in space.cells){
                for(var y in space.cells[x]){
                    space.cells[x][y].push(...Array.apply(null, Array(max_z-space.max[2])).map(Number.prototype.valueOf,0))
                }
            }
        }

        space.min    = [
            Math.min(space.min[0], min_x),
            Math.min(space.min[1], min_y),
            Math.min(space.min[2], min_z)]
        space.max    = [
            Math.max(space.max[0], max_x),
            Math.max(space.max[1], max_y),
            Math.max(space.max[2], max_z)]
        space.offset = [1-space.min[0], 1-space.min[1], 1-space.min[2]] /* the vector from the true position to the position in space.cells  */
        space.len    = [space.max[0]-space.min[0]+2,
                        space.max[1]-space.min[1]+2,
                        space.max[2]-space.min[2]+2]
    }


    process.stdout.write("#")
    //console.log(JSON.stringify(obj_list[index]))
    obj_file.forEach((face) => {
        c_face = face.map(vert => space_to_cell(vert))
        min_x = Math.min(c_face[0][0], c_face[1][0], c_face[2][0])
        min_y = Math.min(c_face[0][1], c_face[1][1], c_face[2][1])
        min_z = Math.min(c_face[0][2], c_face[1][2], c_face[2][2])

        max_x = Math.max(c_face[0][0], c_face[1][0], c_face[2][0])
        max_y = Math.max(c_face[0][1], c_face[1][1], c_face[2][1])
        max_z = Math.max(c_face[0][2], c_face[1][2], c_face[2][2])

        for(var x = min_x; x<= max_x; x++){
            for(var y = min_y; y<= max_y; y++){
                for(var z = min_z; z<= max_z; z++){
                    space.cells[x][y][z] |= (+triBoxOverlap(space_to_cell_center([x,y,z]), cell_half_size, face))<<type
                }
            }
        }
    })

    process.stdout.write("#")

    return space
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
