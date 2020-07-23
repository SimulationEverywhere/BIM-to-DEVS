
class CadmiumExtension extends Autodesk.Viewing.Extension {

    constructor(viewer, options) {
        super(viewer, options);
        this._group = null;
        this._button = null;
    }

    load() {
        console.log('CadmiumExtension has been loaded');
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
        console.log('CadmiumExtension has been unloaded');
        return true;
    }

    onToolbarCreated() {
        // Create a new toolbar group if it doesn't exist
        this._group = this.viewer.toolbar.getControl('allCadmiumExtensionToolbar');
        if (!this._group) {
            this._group = new Autodesk.Viewing.UI.ControlGroup('allCadmiumExtensionToolbar');
            this.viewer.toolbar.addControl(this._group);
        }

        // Button for exporting CO2 JSON configuration files
        this._button = new Autodesk.Viewing.UI.Button('co2CadmiumExtensionButton');
        this._button.onClick = (ev) => {
            //alert("Not implemented yet! It has to export the model information to a Cadmium JSON file (CO2 model).");

            // Some basic functionalities to practice:
            //this.showNumWallsFromSelection();
            //this.showOverallNumWalls();

            // Download JSON with the bboxes of some interest objects (walls for now)
            // If something is selected, the extraction will be done with the selection
            // Else, the extraction is done with the entire model
            const selection = this.viewer.getSelection();
            //this.viewer.clearSelection();
            if (selection.length > 0) {
                this.extractWallsDictFromSelection();
            } else {
                this.extractAllWallsDict();
            }
        };
        this._button.setToolTip('Export JSON for CO2 model');
        this._button.addClass('co2CadmiumExtensionIcon');
        this._group.addControl(this._button);

        // Button for exporting Epidemic JSON configuration files
        this._button = new Autodesk.Viewing.UI.Button('epidemicsCadmiumExtensionButton');
        this._button.onClick = (ev) => {
            // Execute an action here
            //alert("Not implemented yet! It has to export the model information to a Cadmium JSON file (Epidemic model).");
            var canv = document.createElement('canvas');
            canv.id = 'canvasAux';
            canv.width = 200;
            canv.height = 200;
            document.body.appendChild(canv); // adds the canvas to the body element

            //var canvRef = document.getElementById('canvasAux');
            var context = canv.getContext('2d');
            context.fillStyle = "#FF0000";
            context.fillRect(0, 0, 50, 50);
            context.fillStyle = "#00FF00";
            context.fillRect(55, 0, 50, 50);
            context.fillStyle = "#0000FF";
            context.fillRect(110, 0, 50, 50);
            context.scale(4, 4);

        };
        this._button.setToolTip('Export JSON for Epidemic model');
        this._button.addClass('epidemicsExtensionIcon');
        this._group.addControl(this._button);
    }

    // ----------------------------------------
    // CUSTOM FUNCTIONS
    // ----------------------------------------

    /*showNumWallsFromSelection() {
        const selection = this.viewer.getSelection();
        //this.viewer.clearSelection();
        var countWalls = 0;

        // Anything selected?
        if (selection.length > 0) {
            this.showNumWalls(selection);
        } else {
            alert("Nothing selected.");
        }
    }

    showOverallNumWalls() {
        var ids = viewer.model.getData().instanceTree.nodeAccess.dbIdToIndex;
        this.showNumWalls(ids);
    }

    showNumWalls(ids) {
        viewer.model.getBulkProperties(ids, ['Category'],
            function(elements){
                var totalWalls = 0;
                var data = [];
                for(var i=0; i<elements.length; i++){
                    console.log(elements[i].properties[0].displayValue);
                    if(elements[i].properties[0].displayValue == "Revit Walls") {
                            totalWalls += 1;
                            data.push({"id": elements[i].dbId});
                    }
                }
                console.log("Total walls: " + totalWalls);
                console.log(data);
                alert("Total walls: " + totalWalls);
            }
        );
    }*/

    extractObjDict(ids) {
        jQuery.ajax({
            url: '/api/forge/extract',
            data:{urn: document.active_urn},
            success: function(result) {
                console.log(result)
                CadmiumExtension.download(JSON.stringify(result), "cadmium_bim_co2.json", "application/json")
            }
        })
    }
/*
        var thisRef = this;
        viewer.model.getBulkProperties(ids, ['Category'],
            function(elements){
                var data = [];
                for(var i=0; i<elements.length; i++){
                    var category = elements[i].properties[0].displayValue;
                    if(category == "Revit Walls" || category == "Revit Windows" || category == "Revit Doors") {
                            var bbox = thisRef.getBoundingBox(elements[i].dbId);
                            var objType = category.substring(6, category.length-1);
                            data.push({"id": elements[i].dbId, "type": objType, "bbox": bbox});
                    }
                }
                CadmiumExtension.formatObjDict(data);  // remove negative values
                var dataStr = JSON.stringify(data).replace(/\"([^(\")"]+)\":/g,"$1:");
                alert(dataStr);
                var scenarioDims = CadmiumExtension.getDimFromObjDict(data);
                alert(scenarioDims);
                CadmiumExtension.drawCanvas(data);
                CadmiumExtension.download(dataStr, "config.json", "application/json");
            }
        );
    }*/

    extractAllWallsDict() {
        var ids = viewer.model.getData().instanceTree.nodeAccess.dbIdToIndex;
        this.extractObjDict(ids);
    }

    extractWallsDictFromSelection() {
        const selection = this.viewer.getSelection();
        this.extractObjDict(selection);
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

    // ----------------------------------------
    // UTILS
    // ----------------------------------------

    getBoundingBox(id) {
        var f = new Float32Array(6);
        var us = this.viewer.model.getUnitScale();
        this.viewer.model.getInstanceTree().getNodeBox(id, f);
        var bbox = f.map((e) => {return e*us});
        bbox = Array.prototype.slice.call(bbox);
        return bbox;
    }

    static getDimFromObjDict(elems) {
        if(elems.length == 0) return;
        var minX = elems[0]["bbox"][0],
            minY = elems[0]["bbox"][1],
            minZ = elems[0]["bbox"][2],
            maxX = elems[0]["bbox"][3],
            maxY = elems[0]["bbox"][4],
            maxZ = elems[0]["bbox"][5];

        for(var i=1; i<elems.length; i++){
            if(elems[i]["bbox"][0]<minX) minX = elems[i]["bbox"][0];
            if(elems[i]["bbox"][1]<minY) minY = elems[i]["bbox"][1];
            if(elems[i]["bbox"][2]<minZ) minZ = elems[i]["bbox"][2];
            if(elems[i]["bbox"][3]>maxX) maxX = elems[i]["bbox"][3];
            if(elems[i]["bbox"][4]>maxY) maxY = elems[i]["bbox"][4];
            if(elems[i]["bbox"][5]>maxZ) maxZ = elems[i]["bbox"][5];
        }

        return [minX, minY, minZ, maxX, maxY, maxZ];
    }

    // Convert the bboxes coordinates to non-negative ones if needed
    static formatObjDict(elems) {
        var dims = CadmiumExtension.getDimFromObjDict(elems);

        for(var i=0; i<elems.length; i++) {
            for(var j=0; j<3; j++) {
                if(dims[j] < 0) {
                    elems[i]["bbox"][j] = elems[i]["bbox"][j] - dims[j];
                    elems[i]["bbox"][j+3] = elems[i]["bbox"][j+3] - dims[j];
                }
            }
        }
        return elems;
    }

    static drawItem(context, elem, ratio) {
        var srcX = elem["bbox"][0]*ratio;
        var srcY = elem["bbox"][1]*ratio;
        var dstX = elem["bbox"][3]*ratio;
        var dstY = elem["bbox"][4]*ratio;

        if(elem["type"] == "Wall") {
            context.strokeStyle = "#000000";
        } else if(elem["type"] == "Window") {
            context.strokeStyle = "#FF0000";
        } else if(elem["type"] == "Door") {
            context.strokeStyle = "#00FF00";
        }

        if(dstX-srcX < dstY-srcY) {
            context.lineWidth = dstX-srcX;
            srcX += context.lineWidth/2;
            dstX -= context.lineWidth/2;
        } else {
            context.lineWidth = dstY-srcY;
            srcY += context.lineWidth/2;
            dstY -= context.lineWidth/2;
        }
        context.beginPath();
        context.moveTo(srcX, srcY);
        context.lineTo(dstX, dstY);
        context.stroke();
        context.closePath();
    }

    static drawCanvas(elems) {
        var dims = CadmiumExtension.getDimFromObjDict(elems);
        var ratio = 30;
        var canv = document.createElement('canvas');
        //var prec = 200; // mm (width of each cell in the scenario)
        canv.id = 'canvasAux';
        canv.width = dims[3]*ratio;
        canv.height = dims[4]*ratio;
        document.body.appendChild(canv); // adds the canvas to the body element
        var context = canv.getContext('2d');

        for(var i=0; i<elems.length; i++) {  // Draw walls first...
            if(elems[i] == "Wall")
                CadmiumExtension.drawItem(context, elems[i], ratio);
        }

        for(var i=0; i<elems.length; i++) {  // ... and then the rest of the objects
            if(elems[i] != "Wall")
                CadmiumExtension.drawItem(context, elems[i], ratio);
        }

        //canv.style.width = (dims[3]*1000/prec) + 'px';
        //canv.style.height = (dims[4]*1000/prec) + 'px';
    }

    /*getLeafFragIds( model, leafId ) {
        const instanceTree = model.getData().instanceTree;
        const fragIds = [];

        instanceTree.enumNodeFragments( leafId, function( fragId ) {
            fragIds.push( fragId );
        });

        return fragIds;
    }

    getComponentGeometry( viewer, dbId ) {
        const fragIds = getLeafFragIds( viewer.model, dbId );

        let matrixWorld = null;

        const meshes = fragIds.map( function( fragId ) {

            const renderProxy = viewer.impl.getRenderProxy( viewer.model, fragId );

            const geometry = renderProxy.geometry;
            const attributes = geometry.attributes;
            const positions = geometry.vb ? geometry.vb : attributes.position.array;

            const indices = attributes.index.array || geometry.ib;
            const stride = geometry.vb ? geometry.vbstride : 3;
            const offsets = geometry.offsets;

            matrixWorld = matrixWorld || renderProxy.matrixWorld.elements;

            return {
            positions,
            indices,
            offsets,
            stride
            };
        });

        return {
            matrixWorld,
            meshes
        };
    }*/

}

Autodesk.Viewing.theExtensionManager.registerExtension('CadmiumExtension', CadmiumExtension);
