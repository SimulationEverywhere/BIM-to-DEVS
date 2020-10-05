
class DataExtractExtension extends Autodesk.Viewing.Extension {

    constructor(viewer, options) {
        super(viewer, options);
        this._group = null;
        this._button = null;
    }

    load() {
        console.log('DataExtractExtension has been loaded');
        return true;
    }

    unload() {
        // Clean our UI elements if we added any
        if (this._group) {
            this._group.removeControl(this._button);
            if (this._group.getNumberOfControls() === 0) {
                this.viewer.toolbar.removeControl(this._group);
            }
        }
        console.log('DataExtractExtension has been unloaded');
        return true;
    }

    onToolbarCreated() {
        // Create a new toolbar group if it doesn't exist
        this._group = this.viewer.toolbar.getControl('allDataExtractExtensionToolbar');
        if (!this._group) {
            this._group = new Autodesk.Viewing.UI.ControlGroup('allDataExtractExtensionToolbar');
            this.viewer.toolbar.addControl(this._group);
        }

        // Button for exporting CO2 JSON configuration files
        this._button = new Autodesk.Viewing.UI.Button('co2DataExtractExtensionButton');
        this._button.onClick = (ev) => {

        // //single object detection
        //const selection = this.viewer.getSelection();
        // this.extractObjDict(selection);

        //getting the id's of the material
        var ids = viewer.model.getData().instanceTree.nodeAccess.dbIdToIndex;
        this.extractObjDict(ids);


        };
        this._button.setToolTip('Export JSON for CO2 model');
        this._button.addClass('DataExtractExtensionIcon');
        this._group.addControl(this._button);

    }


    async extractObjDict(ids){
        let catagories = []
        let sql_queries = [
                        `SELECT DISTINCT
                        	entity_id AS id
                        FROM
                        	_objects_eav
                        	LEFT OUTER JOIN _objects_id ON _objects_eav.entity_id = _objects_id.id
                        	LEFT OUTER JOIN _objects_attr ON _objects_eav.attribute_id = _objects_attr.id
                        	LEFT OUTER JOIN _objects_val ON _objects_eav.value_id = _objects_val.id
                        WHERE
                        	category == "__category__" AND
                        	value    == "Revit Walls";`.replace(/\s+/g, ' '),
                        `SELECT DISTINCT
                        	entity_id AS id
                        FROM
                        	_objects_eav
                        	LEFT OUTER JOIN _objects_id ON _objects_eav.entity_id = _objects_id.id
                        	LEFT OUTER JOIN _objects_attr ON _objects_eav.attribute_id = _objects_attr.id
                        	LEFT OUTER JOIN _objects_val ON _objects_eav.value_id = _objects_val.id
                        WHERE
                        	category == "__category__" AND
                        	value    == "Revit Windows";`.replace(/\s+/g, ' '),
                        `SELECT DISTINCT
                        	entity_id AS id
                        FROM
                        	_objects_eav
                        	LEFT OUTER JOIN _objects_id ON _objects_eav.entity_id = _objects_id.id
                        	LEFT OUTER JOIN _objects_attr ON _objects_eav.attribute_id = _objects_attr.id
                        	LEFT OUTER JOIN _objects_val ON _objects_eav.value_id = _objects_val.id
                        WHERE
                        	category == "__category__" AND
                        	value    == "Revit Doors";`.replace(/\s+/g, ' ')
                    ]

        const filter_object_ids = async (ids, catagories) => {
            if(catagories.length == 0){
                return []
            }
            const getBulkPropertiesPromise = (...args) => {
                return new Promise((resolve, reject) => {
                    viewer.model.getBulkProperties(...args, (data) => {
                        resolve(data)
                    })
                })
            }
            var outputs = []
            while(outputs.length < catagories.length){
                outputs.push([])
            }
            await getBulkPropertiesPromise(ids, ['Category'])
                .then((elms) => {
                    elms.forEach((elm) => {
                        catagories.forEach((cat, index) => {
                            if(cat == elm.properties[0].displayValue){
                                outputs[index].push(elm.dbId)
                            }
                        })
                    })
                })
            return outputs
        }


        var filtered_ids = await filter_object_ids(ids, catagories)
        console.log(filtered_ids)
        jQuery.get('/api/forge/extract',
                {
                    urn        : document.active_urn,
                    view_name  : "3D",
                    catagories : JSON.stringify(filtered_ids),
                    sql        : sql_queries
                },
                (result) => {
                    console.log(result)
                    DataExtractExtension.drawcanvas(result)
                    DataExtractExtension.download(JSON.stringify(result), "cadmium_bim_co2.json", "application/json")
                })
    }

    static drawcanvas(results) {
        const cell_scale = 16
        for(var z = 0; z<results.cells[0][0].length; z++){
            let canvas = document.createElement('canvas');
            canvas.id="z="+z
            canvas.width=results.cells.length*results.cell_size[0]*cell_scale
            canvas.height=results.cells[0].length*results.cell_size[1]*cell_scale
            document.body.appendChild(canvas);
            var ctx = canvas.getContext("2d");
            results.cells.forEach((sub_space, x) => {
                sub_space.forEach((sub_sub_space, y) => {
                    var val = sub_sub_space[z]
                    if(val & 1<<2){
                        //door
                        ctx.fillStyle = "rgb(0, 255, 0)"
                    }else if(val  & 1<<1){
                        //window
                        ctx.fillStyle = "rgb(255, 0, 0)"
                    }else if(val  & 1<<0){
                        //wall
                        ctx.fillStyle = "rgb(0, 0, 0)"
                    }else{
                        //air
                        ctx.fillStyle = "rgb(255, 255, 255)"
                    }
                    ctx.fillRect( x*results.cell_size[0]*cell_scale, y*results.cell_size[1]*cell_scale, results.cell_size[0]*cell_scale, results.cell_size[1]*cell_scale)
                })
            })
        }
    }

    static download(data, filename, type) {
        var file = new Blob([data], {type: type});
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            var a = document.createElement("a"),
                    url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    }

}

Autodesk.Viewing.theExtensionManager.registerExtension('DataExtractExtension', DataExtractExtension);
