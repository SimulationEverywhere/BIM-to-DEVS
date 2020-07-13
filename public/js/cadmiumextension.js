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
            // Get current selection
            const selection = this.viewer.getSelection();
            this.viewer.clearSelection();
            // Anything selected?
            if (selection.length > 0) {
                // Iterate through the list of selected dbIds
                selection.forEach((dbId) => {
                    // Get properties of each dbId
                    this.viewer.getProperties(dbId, (props) => {
                        // Output properties to console
                        console.log(props);
                    });
                });
            } else {
                // If nothing selected, restore
                this.viewer.isolate(0);
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