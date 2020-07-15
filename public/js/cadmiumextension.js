
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
            alert("Not implemented yet! It has to export the model information to a Cadmium JSON file (Epidemic model).");
        };
        this._button.setToolTip('Export JSON for Epidemic model');
        this._button.addClass('epidemicsExtensionIcon');
        this._group.addControl(this._button);
    }

    // ----------------------------------------
    // CUSTOM FUNCTIONS
    // ----------------------------------------

    showNumWallsFromSelection() {
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
    }

    extractObjDict(ids) {
        var saveJson = this.saveJSON;
        viewer.model.getBulkProperties(ids, ['Category'],
            function(elements){
                var data = [];
                for(var i=0; i<elements.length; i++){
                    var category = elements[i].properties[0].displayValue;
                    if(category == "Revit Walls" || category == "Revit Windows" || category == "Revit Doors") {
                            var f = new Float32Array(6);
                            var us = viewer.model.getUnitScale();
                            viewer.model.getInstanceTree().getNodeBox(elements[i].dbId, f);
                            var bbox = f.map((e) => {return e*us});
                            bbox = Array.prototype.slice.call(bbox);
                            var objType = category.substring(6, category.length-1);
                            data.push({"id": elements[i].dbId, "type": objType, "bbox": bbox});
                    }
                }
                var dataStr = JSON.stringify(data).replace(/\"([^(\")"]+)\":/g,"$1:");
                alert(dataStr);
                CadmiumExtension.download(dataStr, "config.json", "application/json");
            }
        );
    }

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
        fs = f.map((e) => {return e*us});
        return fs;
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