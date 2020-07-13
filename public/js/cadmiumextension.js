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
            // For now I count the walls here...

            // Get current selection
            const selection = this.viewer.getSelection();
            this.viewer.clearSelection();
            var countWalls = 0;

            // Anything selected?
            if (selection.length > 0) {
                viewer.model.getBulkProperties(selection, ['Category'],
                function(elements){
                    var totalWalls = 0;
                    for(var i=0; i<elements.length; i++){
                    console.log(elements[i].properties[0].displayValue);
                        if(elements[i].properties[0].displayValue == "Revit Walls") {
                                totalWalls += 1;//elements[i].properties[0].displayValue;
                        }
                    }
                    console.log("Total walls: " + totalWalls);
                    alert("Total walls: " + totalWalls);
                });
            } else {
                alert("Nothing selected.");
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
}

Autodesk.Viewing.theExtensionManager.registerExtension('CadmiumExtension', CadmiumExtension);