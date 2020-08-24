class DataExtractExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._group = null;
        this._button = null;
    }

    load() {
        console.log('DataExtractExtensions has been loaded');
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
        console.log('DataExtractExtensions has been unloaded');
        return true;
    }

    onToolbarCreated() {
        // Create a new toolbar group if it doesn't exist
        this._group = this.viewer.toolbar.getControl('allDataExtractExtensionsToolbar');
        if (!this._group) {
            this._group = new Autodesk.Viewing.UI.ControlGroup('allDataExtractExtensionsToolbar');
            this.viewer.toolbar.addControl(this._group);
        }

        // Add a new button to the toolbar group
        this._button = new Autodesk.Viewing.UI.Button('DataExtractExtensionButton');
        this._button.onClick = (ev) => {
            // Execute an action here
            alert("Data Extracted");
            var thisRef = this;
            var data = [];
            // First, the viewer contains all elements on the model, including
            // categories (e.g. families or part definition), so we need to enumerate
            // the leaf nodes, meaning actual instances of the model. The following
            // getAllLeafComponents function is defined at the bottom
            this.getAllLeafComponents((dbIds) => {
                // Now for leaf components, let's get some properties and count occurrences of each value
                const filteredProps = ['Category'];
                // Get only the properties we need for the leaf dbIds
                this.viewer.model.getBulkProperties(dbIds, filteredProps, (elements) => {
                    // Iterate through the elements we found
                   
                    for(var i=0; i<elements.length; i++){
                        var category = elements[i].properties[0].displayValue;
                        console.log(category);
                        if(category == "Revit Walls" || category == "Revit Windows" || category == "Revit Doors") {
                                var bbox = thisRef.getBoundingBox(elements[i].dbId);
                                var objType = category.substring(6, category.length-1);
                                data.push({"id": elements[i].dbId, "type": objType, "bbox": bbox});
                        }
                    }
                DataExtractExtension.formatObjDict(data);  // remove negative values
                var dataStr = JSON.stringify(data).replace(/\"([^(\")"]+)\":/g,"$1:");
                alert(dataStr);
                var scenarioDims = DataExtractExtension.getDimFromObjDict(data);
                alert(scenarioDims);
                DataExtractExtension.drawCanvas(data);
                DataExtractExtension.download(dataStr, "config.json", "application/json");
                });
            });
            console.log("Data extracted : ",data);

        };
        this._button.setToolTip('My Awesome Extension');
        this._button.addClass('DataExtractExtensionIcon');
        this._group.addControl(this._button);
    }

    getAllLeafComponents(callback) {
        this.viewer.getObjectTree(function (tree) {
            let leaves = [];
            tree.enumNodeChildren(tree.getRootId(), function (dbId) {
                if (tree.getChildCount(dbId) === 0) {
                    leaves.push(dbId);
                }
            }, true);
            callback(leaves);
        });
    }

    getBoundingBox(id) {
        var f = new Float32Array(6);
        var us = this.viewer.model.getUnitScale();
        this.viewer.model.getInstanceTree().getNodeBox(id, f);
        var bbox = f.map((e) => {return e*us});
        bbox = Array.prototype.slice.call(bbox);
        return bbox;
    }

    // Convert the bboxes coordinates to non-negative ones if needed
    static formatObjDict(elems) {
        var dims = DataExtractExtension.getDimFromObjDict(elems);

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

    static drawCanvas(elems) {
        var dims = DataExtractExtension.getDimFromObjDict(elems);
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
                DataExtractExtension.drawItem(context, elems[i], ratio);
        }

        for(var i=0; i<elems.length; i++) {  // ... and then the rest of the objects
            if(elems[i] != "Wall")
                DataExtractExtension.drawItem(context, elems[i], ratio);
        }

        //canv.style.width = (dims[3]*1000/prec) + 'px';
        //canv.style.height = (dims[4]*1000/prec) + 'px';
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
    
}

Autodesk.Viewing.theExtensionManager.registerExtension('DataExtractExtension', DataExtractExtension);
