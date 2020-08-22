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
                        if(category == "Revit Walls" || category == "Revit Windows" || category == "Revit Doors") {
                                var bbox = thisRef.getBoundingBox(elements[i].dbId);
                                var objType = category.substring(6, category.length-1);
                                data.push({"id": elements[i].dbId, "type": objType, "bbox": bbox});
                        }
                    }
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
    
}



Autodesk.Viewing.theExtensionManager.registerExtension('DataExtractExtension', DataExtractExtension);
