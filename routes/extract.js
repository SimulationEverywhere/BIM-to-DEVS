const { OAuth } = require('./common/oauth')
const express = require('express')
const request = require('request')
const request_promise = require('request-promise')
const os = require('os')
const fs = require('fs')
const path = require('path')
const sqlite3 = require('sqlite3')
const readline = require('readline')
const OBJFile = require('obj-file-parser')
const colors = require('colors')


const catchall = function(x) {
    console.log("Bad promise")
    console.log(x.toString())
    console.log()
    console.log(JSON.stringify(x))
}

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
    '     (_objects_val.value = "Revit Walls" OR _objects_val.value = "Revit Floors" OR _objects_val.value = "Revit Roofs");');


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
                                db.all(sql_query_doors, [], async (err, door_rows) => {if (err) throw err;
                                    var wall_ids = wall_rows.map(x => x.id)
                                    var window_ids = window_rows.map(x => x.id)
                                    var door_ids = door_rows.map(x => x.id)

                                    var wall_data = {
                                        input:{"urn":urn},
                                        output:{
                                            destination:{region:"us"},
                                            formats: [
                                                {
                                                    type: "obj",
                                                    advanced: {
                                                        unit:"meter",
                                                        modelGuid:guid,
                                                        objectIds: wall_ids
                                                    }
                                                }
                                            ]}
                                        };
                                    var window_data = {
                                            input:{"urn":urn},
                                            output:{
                                                destination:{region:"us"},
                                                formats: [
                                                    {
                                                        type: "obj",
                                                        advanced: {
                                                            unit:"meter",
                                                            modelGuid:guid,
                                                            objectIds: window_ids
                                                        }
                                                    }
                                                ]}
                                            };
                                    var door_data = {
                                            input:{"urn":urn},
                                            output:{
                                                destination:{region:"us"},
                                                formats: [
                                                    {
                                                        type: "obj",
                                                        advanced: {
                                                            unit:"meter",
                                                            modelGuid:guid,
                                                            objectIds:door_ids
                                                        }
                                                    }
                                                ]}
                                            };

                                    wall_body_p = request_promise.post({  url:"https://developer.api.autodesk.com/modelderivative/v2/designdata/job",
                                                    body:JSON.stringify(wall_data),
                                                    headers:Object.assign({}, auth_header, {"Content-Type":"application/json; charset=utf-8"})}).catch(catchall)
                                    window_body_p = request_promise.post({  url:"https://developer.api.autodesk.com/modelderivative/v2/designdata/job",
                                                    body:JSON.stringify(window_data),
                                                    headers:Object.assign({}, auth_header, {"Content-Type":"application/json; charset=utf-8"})}).catch(catchall)
                                    door_body_p = request_promise.post({  url:"https://developer.api.autodesk.com/modelderivative/v2/designdata/job",
                                                    body:JSON.stringify(door_data),
                                                    headers:Object.assign({}, auth_header, {"Content-Type":"application/json; charset=utf-8"})}).catch(catchall)
                                    //body_p = await Promise.all([wall_body_p, window_body_p, door_body_p])
                                    await Promise.all([wall_body_p, window_body_p, door_body_p])

                                    //console.log()
                                    //console.log(body_p[0])
                                    //console.log()
                                    //console.log(body_p[1])
                                    //console.log()
                                    //console.log(body_p[2])
                                    //console.log()

                                    var options = {url:"https://developer.api.autodesk.com/modelderivative/v2/designdata/"+urn+"/manifest", headers:auth_header}
                                    var manifest_body = null
                                    while(!manifest_body || ["inprogress","pending"].includes(JSON.parse(manifest_body).status)){
                                        if(manifest_body){console.log(JSON.parse(manifest_body).status)}
                                        manifest_body = await request_promise(options).catch(catchall)
                                    }
                                    console.log()
                                    console.log(manifest_body)
                                    console.log()

                                    var obj_manifest = JSON.parse(manifest_body).derivatives.find(x => (x.outputType && x.outputType === "obj"))
                                    if(!obj_manifest) throw("There is no obj file, try again?");

                                    var wall_manifest   = obj_manifest.children.find(x => (x.objectIds && x.objectIds.every(y => wall_ids.includes(y))))
                                    var door_manifest   = obj_manifest.children.find(x => (x.objectIds && x.objectIds.every(y => door_ids.includes(y))))
                                    var window_manifest = obj_manifest.children.find(x => (x.objectIds && x.objectIds.every(y => window_ids.includes(y))))
                                    if(!wall_manifest || !door_manifest || !window_manifest) throw("There is no obj file, try again?");

                                    console.log()
                                    console.log(JSON.stringify(wall_manifest))
                                    console.log()
                                    console.log(JSON.stringify(door_manifest))
                                    console.log()
                                    console.log(JSON.stringify(window_manifest))
                                    console.log()

                                    var wall_file_p = request_promise({url:"https://developer.api.autodesk.com/derivativeservice/v2/derivatives/"+wall_manifest.urn.split('/').map(x => encodeURIComponent(x)).join('/'), headers:auth_header})
                                    var door_file_p = request_promise({url:"https://developer.api.autodesk.com/derivativeservice/v2/derivatives/"+door_manifest.urn.split('/').map(x => encodeURIComponent(x)).join('/'), headers:auth_header})
                                    var window_file_p = request_promise({url:"https://developer.api.autodesk.com/derivativeservice/v2/derivatives/"+window_manifest.urn.split('/').map(x => encodeURIComponent(x)).join('/'), headers:auth_header})


                                    res.send(handle_obj_file(new OBJFile(await wall_file_p, "walls").parse(),
                                                    new OBJFile(await door_file_p, "doors").parse(),
                                                    new OBJFile(await window_file_p, "windows").parse()))

                                    db.close()
                                })
                            })
                        })
                    })
                })
            })
        })
    })
})





function handle_obj_file(wall_obj, door_obj, window_obj){
    const cell_size = 0.25


    const to_cell = (x => Math.floor(x/cell_size))

    console.log("#############################")
    //console.log()
    //console.log(JSON.stringify(wall_obj))
    //console.log()
    //console.log(JSON.stringify(door_obj))
    //console.log()
    //console.log(JSON.stringify(window_obj))
    //console.log()

    //First, make bounding box
    //I assume that there is at least 1 wall vertex
    var v = wall_obj.models[0].vertices[0]

    var max_x = v.x
    var max_y = v.y
    var max_z = v.z

    var min_x = v.x
    var min_y = v.y
    var min_z = v.z

    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")

    var obj_list = [wall_obj, door_obj, window_obj]
    //console.log(obj_list)
    obj_list.forEach(obj => obj.models.forEach(model => model.vertices.forEach(vert => {
        max_x = Math.max(vert.x, max_x)
        max_y = Math.max(vert.y, max_y)
        max_z = Math.max(vert.z, max_z)

        min_x = Math.min(vert.x, min_x)
        min_y = Math.min(vert.y, min_y)
        min_z = Math.min(vert.z, min_z)
    })))

    console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^")

    const x_off = -to_cell(min_x)+2
    const y_off = -to_cell(min_y)+2
    const z_off = -to_cell(min_z)+2

    const to_x = (x => to_cell(x)+x_off)
    const to_y = (y => to_cell(y)+y_off)
    const to_z = (z => to_cell(z)+z_off)

    //to the middle of the pocket of space that maps to this cell
    const from_x = (x_cell => (x_cell-x_off+0.5)*cell_size)
    const from_y = (y_cell => (y_cell-y_off+0.5)*cell_size)
    const from_z = (z_cell => (z_cell-z_off+0.5)*cell_size)

    const x_len = to_x(max_x)+2
    const y_len = to_y(max_y)+2
    const z_len = to_z(max_z)+2

    console.log([x_len, y_len, z_len])
    //is wall, flooded by wall, is door, flooded by door, is window, flooded by window
    var space = []
    for(var i = 0; i<x_len; i++){
        space.push([])
        for(var j = 0; j<y_len; j++){
            space[i].push([])
            for(var k = 0; k<z_len; k++){
                space[i][j].push([false, false, false, false, false, false])
            }
        }
    }

    //console.log(JSON.stringify(space))
    //console.log(space.length)
    //console.log(space[0].length)
    //console.log(space[0][0].length)

    const vert_to_vec = (vert => [vert.x, vert.y, vert.z])
    const norm_and_point_to_plain = ((norm, point) => ([norm[0], norm[1], norm[2], -norm[0]*point[0]-norm[1]*point[1]-norm[2]*point[2]]))
    const point_and_plain_to_dist = ((point, plane) => (Math.abs(point[0]*plane[0]+point[1]*plane[1]+point[2]*plane[2]+plane[3])))
    const add_vec = ((vec_a, vec_b) => [vec_a[0]+vec_b[0],vec_a[1]+vec_b[1],vec_a[2]+vec_b[2]])
    const sub_vec = ((vec_a, vec_b) => [vec_a[0]-vec_b[0],vec_a[1]-vec_b[1],vec_a[2]-vec_b[2]])
    const scale_vec = ((vec, sca) => [vec[0]*sca,vec[1]*sca,vec[2]*sca])
    const dist_vec = ((vec_a, vec_b) => (len_vec(sub_vec(vec_a, vec_b))))
    const neg_vec = ((vec) => [-vec[0],-vec[1],-vec[2]])
    const cross_vec = ((vec_a, vec_b) => (
        [(vec_a[2]*vec_b[3]-vec_a[3]*vec_b[2]),
         (vec_a[3]*vec_b[1]-vec_a[1]*vec_b[3]),
         (vec_a[1]*vec_b[2]-vec_a[2]*vec_b[1])]))
    const dot_vec = ((vec_a, vec_b) => (vec_a[0]*vec_b[0]+vec_a[1]*vec_b[1]+vec_a[2]*vec_b[2]))
    const len_vec = ((vec)=>(Math.sqrt(vec[0]*vec[0]+vec[1]*vec[1]+vec[2]*vec[2])))
    const norm_vec = ((vec) => {len = len_vec(vec);return [vec[0]/len,vec[1]/len,vec[2]/len]})

    const same_side = ((p_a, p_b, p_in, p_q) =>(
        dot_vec(
            cross_vec(sub_vec(p_a, p_b), sub_vec(p_a, p_in)),
            cross_vec(sub_vec(p_a, p_b), sub_vec(p_a, p_q))
            ) > 0))

    const line_and_point_to_dist = ((l0, l1, point) => {
        var norm_line = norm_vec(sub_vec(l1, l0))
        return dist_vec(add_vec(l0, scale_vec(dot_vec(sub_vec(point, l0), norm_line), norm_line)), point)
    })

    const fill_tri = ((vert0, vert1, vert2, bit, cell_reach) => {

        let vec_a = vert_to_vec(vert0)
        let vec_b = vert_to_vec(vert1)
        let vec_c = vert_to_vec(vert2)

        let vec_ab = sub_vec(vec_b, vec_a)
        let vec_bc = sub_vec(vec_c, vec_b)
        let vec_ca = sub_vec(vec_a, vec_c)

        let max_x = Math.max(vec_a[0],vec_b[0],vec_c[0])+cell_reach
        let max_y = Math.max(vec_a[1],vec_b[1],vec_c[1])+cell_reach
        let max_z = Math.max(vec_a[2],vec_b[2],vec_c[2])+cell_reach

        let min_x = Math.min(vec_a[0],vec_b[0],vec_c[0])-cell_reach
        let min_y = Math.min(vec_a[1],vec_b[1],vec_c[1])-cell_reach
        let min_z = Math.min(vec_a[2],vec_b[2],vec_c[2])-cell_reach

        //perhaps use the max of the 3 cross products?
        let plane = norm_and_point_to_plain(norm_vec(cross_vec(vec_ab, vec_bc)), vec_a)

        for(var x = Math.max(0, to_x(min_x)); x <= Math.min(x_len-1, to_x(max_x)); x++){
            for(var y = Math.max(0, to_y(min_y)); y <= Math.min(y_len-1, to_y(max_y)); y++){
                for(var z = Math.max(0, to_z(min_z)); z <= Math.min(z_len-1, to_z(max_z)); z++){
                    var vec_p = [from_x(x), from_y(y), from_z(z)]
                    var dist_to_plane = point_and_plain_to_dist(vec_p, plane)
                    var closest_point = add_vec(vec_p, scale_vec(plane, dist_to_plane))
                    space[x][y][z][bit] |= !(dist_to_plane > cell_reach) && (
                        (cell_reach <= dist_vec(vec_p, vec_a)) ||
                        (cell_reach <= dist_vec(vec_p, vec_b)) ||
                        (cell_reach <= dist_vec(vec_p, vec_c)) ||
                        (cell_reach <= line_and_point_to_dist(vec_a, vec_b, vec_p)) ||
                        (cell_reach <= line_and_point_to_dist(vec_a, vec_c, vec_p)) ||
                        (cell_reach <= line_and_point_to_dist(vec_b, vec_c, vec_p)) ||
                        (same_side(vec_a, vec_b, vec_c, vec_p) && same_side(vec_b, vec_c, vec_a, vec_p) && same_side(vec_c, vec_a, vec_b, vec_p))
                    )
                }
            }
        }
    })

    const flood_space_r = (bit_check, bit_set, accept_set, x, y, z) => {
        //console.log([x, y, z])
        var out = []
        x+1 < space.length       && !space[x+1][y][z][bit_set] && (!space[x+1][y][z][bit_check] || accept_set.some(a => space[x+1][y][z][a])) && (space[x+1][y][z][bit_set] = true) && out.push([x+1, y, z])
        x-1 >= 0                 && !space[x-1][y][z][bit_set] && (!space[x-1][y][z][bit_check] || accept_set.some(a => space[x-1][y][z][a])) && (space[x-1][y][z][bit_set] = true) && out.push([x-1, y, z])
        y+1 < space[x].length    && !space[x][y+1][z][bit_set] && (!space[x][y+1][z][bit_check] || accept_set.some(a => space[x][y+1][z][a])) && (space[x][y+1][z][bit_set] = true) && out.push([x, y+1, z])
        y-1 >= 0                 && !space[x][y-1][z][bit_set] && (!space[x][y-1][z][bit_check] || accept_set.some(a => space[x][y-1][z][a])) && (space[x][y-1][z][bit_set] = true) && out.push([x, y-1, z])
        z+1 < space[x][y].length && !space[x][y][z+1][bit_set] && (!space[x][y][z+1][bit_check] || accept_set.some(a => space[x][y][z+1][a])) && (space[x][y][z+1][bit_set] = true) && out.push([x, y, z+1])
        z-1 >= 0                 && !space[x][y][z-1][bit_set] && (!space[x][y][z-1][bit_check] || accept_set.some(a => space[x][y][z-1][a])) && (space[x][y][z-1][bit_set] = true) && out.push([x, y, z-1])
        //console.log(out)
        return out
    }

    const flood_space = ((bit_check, bit_set, accept_set) => {
        space[0][0][0][bit_set] = true;
        var stack = [[[0,0,0]]]
        while(stack.length >0){
            var frame = stack.pop()
            for(var i = 0; i<frame.length; i++){
                stack.push(flood_space_r(bit_check, bit_set, accept_set, frame[i][0], frame[i][1], frame[i][2]))
            }
        }
    })

    const apply_obj = ((obj_content, bit_set, cell_reach) => {
            obj_content.models.forEach(model =>
                model.faces.forEach(face =>{
                    fill_tri(
                        model.vertices[face.vertices[0].vertexIndex-1],
                        model.vertices[face.vertices[1].vertexIndex-1],
                        model.vertices[face.vertices[2].vertexIndex-1],
                        bit_set,
                        cell_reach)
                    }
                )
            )
    })



    apply_obj(wall_obj, 0, 0.1)
    apply_obj(door_obj, 2, 0.125)
    apply_obj(window_obj, 4, 0.125)

    flood_space(0, 1, [2,3,4,5])
    flood_space(2, 3, [])
    flood_space(4, 5, [])
    /*
    for(var z = 0; z<z_len; z++){
        console.log("\nz = "+z.toString().padStart(3)+"  0123456789012345678901234567890123456789012")
        for(var y = 0; y<y_len; y++){
            console.log("y = "+y.toString().padStart(3)+": " + space.map(x => x[y][z]).map(data => {
                if(data[4]){
                    return 'G'.brightGreen
                }else if(!data[5]){
                    return 'g'.green
                }else if(data[2]){
                    return 'D'.brightRed
                }else if(!data[3]){
                    return 'd'.red
                }else if(data[0]){
                    return '#'.brightBlue
                }else if(!data[1]){
                    return '.'.blue
                }else{
                    return ' '
                }
            }).join(''))
        }
    }
    */
    return make_devs_json(space, x_off, y_off, z_off)
}

function make_devs_json(space, x_off, y_off, z_off){
    var devs = {
        "scenario": {
            "offset_vector" : [x_off, y_off, z_off],
            "shape": [space.length, space[0].length, space[0][0].length],
            "wrapped": false,
            "default_delay": "transport",
            "default_cell_type": "CO2_cell",
            "default_state": {
                "counter": -1,
                "concentration": 500,
                "type": -100
            },
            "default_config": {
                "CO2_cell": {
                    "conc_increase": 143.2,
                    "base": 500,
                    "resp_time": 5,
                    "window_conc": 400,
                    "vent_conc": 300
                }
            },
            "neighborhood": [
                {
                    "type": "von_neumann",
                    "range": 1
                }
            ]
        },
        "cells": []
    }
    for(var x = 0; x<space.length; x++){
        for(var y = 0; y<space[x].length; y++){
            for(var z = 0; z<space[x][y].length; z++){
                var cell = space[x][y][z]
                // {AIR=-100, CO2_SOURCE=-200, IMPERMEABLE_STRUCTURE=-300, DOOR=-400, WINDOW=-500, VENTILATION=-600, WORKSTATION=-700}
                if(cell[2] || !cell[3]){
                    //door
                    devs.cells.push({"cell_id":[x,y,z], "state":{"concentration": 500, "type": -400, "counter": -1}})
                }else if(cell[4] || !cell[5]){
                    //window
                    devs.cells.push({"cell_id":[x,y,z], "state":{"concentration": 500, "type": -500, "counter": -1}})
                }else if(cell[0] || !cell[1]){
                    //wall
                    devs.cells.push({"cell_id":[x,y,z], "state":{"concentration": 500, "type": -300, "counter": -1}})
                //}else{ //no need to add the default cells
                    //air
                    //devs.cells.push({"cell_id":[x,y,z], "state":{"concentration": 500, "type": -100, "counter": -1}})
                }
            }
        }
    }
    return devs
}




module.exports = router;
