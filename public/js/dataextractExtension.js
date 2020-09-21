
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
                    if(category == "Revit Walls" || category == "Revit Windows" || category == "Revit Doors" || category == "Revit Mechanical Equipment") { 
                            dataID.push(elements[d].dbId);
                             var objType = category.substring(6, category.length-1);
                             datas.push({"id": elements[d].dbId, "type": objType});
                    }
                }
                DataExtractExtension.getDBID_ChairsOnly(dataID, datas);
            }
        );
    }   
    
    static getDBID_ChairsOnly(dataID, datas) {
        function doneSearch(dbids) {
            // dbids here are all the chairs
            // this is where you do a rayhit
            var dbIDS = [];
            var arr =[];
            dbIDS = dataID.concat(dbids);
            
            for(let i = 0; i < dbids.length; i++){
                arr.push({"id": dbids[i], "type": 'Chair'});
            }

            Array.prototype.push.apply(datas,arr);
            DataExtractExtension.drawcanvas(dbIDS, datas);
        }
        viewer.search('"Chair model 01 ["', dbids => {
            doneSearch(dbids)}, null, ["name"] );
    }

    static drawcanvas(dataID, datas) {
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
         let ray = new THREE.Ray(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 0.1, -1));
         let i = 0;
         var intersectionData = [];
         for (let j = 0; j < height; j++) {
             for (let k = 0; k < width; k++) {
                 ray.origin.x = bounds.min.x + k * cellSize;
                 ray.origin.y = bounds.min.y + j * cellSize;
                 const intersection = viewer.impl.rayIntersect(ray, false, dataID);
                
                  if (intersection){

                    //getting the intersected points to be used for Cadmium input 
                       for(let c = 0; c < datas.length; c++) {
                            if(datas[c].id == intersection.dbId)
                               intersectionData.push({"point":intersection.intersectPoint, "dbID":intersection.dbId, "type":datas[c].type});
                         }

                            // COLOR THE OBJECTS IN THE IMAGE
                            var objType=datas.filter((row)=>{
                                if(row.id==intersection.dbId){
                                    return row;
                                }
                            });
                            var type="";
                            if(objType.length>0){
                                type=objType[0].type;
                            }
                            if(type=="Wall"){
                                data.data[i] = 0;
                                data.data[i + 1] = 0;
                                data.data[i + 2] = 0;
                                data.data[i + 3] = 255;
                            }else if(type=="Window"){
                                data.data[i] = 255;
                                data.data[i + 1] = 0;
                                data.data[i + 2] = 0;
                                data.data[i + 3] = 255;
                            }else if(type=="Door"){
                                data.data[i] = 0;
                                data.data[i + 1] = 255;
                                data.data[i + 2] = 0;
                                data.data[i + 3] = 255;
                            }
                            else if(type=="Chair"){
                                data.data[i] = 255;
                                data.data[i + 1] = 0;
                                data.data[i + 2] = 255;
                                data.data[i + 3] = 255;
                            }
                            else if(type=="Mechanical Equipmen"){
                                data.data[i] = 0;
                                data.data[i + 1] = 0;
                                data.data[i + 2] = 255;
                                data.data[i + 3] = 255;
                            }
                            else{
                            data.data[i] = 0;
                            data.data[i + 1] = 255;
                            data.data[i + 2] = 255;
                            data.data[i + 3] = 255;
                            }
                  }
                 i += 4;
             }
         }
         //console.log(intersectionData);
         DataExtractExtension.download(JSON.stringify(intersectionData), "config.json", "application/json");
         context.putImageData(data, 0, 0);
         canvas.style.position = 'absolute';
         canvas.style.zIndex = 100;
         document.body.appendChild(canvas);
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
