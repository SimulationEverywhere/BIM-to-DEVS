
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
        // const selection = this.viewer.getSelection();
        // this.extractObjDict(selection);

        //getting the id's of the material
        var ids = viewer.model.getData().instanceTree.nodeAccess.dbIdToIndex;
        this.extractObjDict(ids);

        //canvas without elementID
        //this.drawcanvas();

        };
        this._button.setToolTip('Export JSON for CO2 model');
        this._button.addClass('co2DataExtractExtensionIcon');
        this._group.addControl(this._button);

    }

    extractObjDict(ids) {
        var thisRef = this;        
      
        //elementID matching bounding box
        viewer.model.getBulkProperties(ids, ['Category'],
            function(elements){
                var dataID = [];
                var datas = [];
                for(var d=0; d<elements.length; d++){
                    var category = elements[d].properties[0].displayValue;
                    if(category == "Revit Walls" || category == "Revit Windows" || category == "Revit Doors" || category == "Revit Furniture Systems" || category == "Revit Mechanical Equipment") {
                             dataID.push(elements[d].dbId);
                             
                            //  var bbox = thisRef.getBoundingBox(elements[d].dbId);
                            //  var objType = category.substring(6, category.length-1);
                            //  datas.push({"id": elements[d].dbId, "type": objType, "bbox": bbox});
                    }
                }
                //DataExtractExtension.formatObjDict(data);  // remove negative values
                //var dataStr = JSON.stringify(data).replace(/\"([^(\")"]+)\":/g,"$1:");
                DataExtractExtension.drawcanvas(dataID);
                //DataExtractExtension.download(dataStr, "config.json", "application/json");
            }
        );
    }   

    // getBoundingBox(id) {
    //     var f = new Float32Array(6);
    //     var us = this.viewer.model.getUnitScale();
    //     this.viewer.model.getInstanceTree().getNodeBox(id, f);
    //     var bbox = f.map((e) => {return e*us});
    //     bbox = Array.prototype.slice.call(bbox);
    //     return bbox;
    // }

    static drawcanvas(dataID) {
        //ray-shooter bounding box method
         var cellSize  = 0.25;
         const bounds = viewer.model.getBoundingBox();
         const width = Math.floor((bounds.max.x - bounds.min.x) / cellSize);
         const height = Math.floor((bounds.max.y - bounds.min.y) / cellSize);  
         const canvas = document.createElement('canvas');
         canvas.setAttribute('width', width + 'px');
         canvas.setAttribute('height', height + 'px');
         const context = canvas.getContext('2d');
         const data = context.getImageData(0, 0, width, height);
         let ray = new THREE.Ray(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1));
         let i = 0;
         for (let j = 0; j < height; j++) {
             for (let k = 0; k < width; k++) {
                 ray.origin.x = bounds.min.x + k * cellSize;
                 ray.origin.y = bounds.min.y + j * cellSize;
                 const intersection = viewer.impl.rayIntersect(ray, false,dataID);
                 if (intersection) {
                     data.data[i] = 0;
                     data.data[i + 1] = 255;
                     data.data[i + 2] = 0;
                     data.data[i + 3] = 255;
                  } //else {
                //     data.data[i] = 0;
                //     data.data[i + 1] = 0;
                //     data.data[i + 2] = 0;
                //     data.data[i + 3] = 255;
                // }
                 i += 4;
             }
         }
         context.putImageData(data, 0, 0);
         canvas.style.position = 'absolute';
         canvas.style.zIndex = 100;
         document.body.appendChild(canvas);
    }

}

Autodesk.Viewing.theExtensionManager.registerExtension('DataExtractExtension', DataExtractExtension);