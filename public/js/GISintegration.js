import Loader from "./loading.js";

export class GisTool extends Autodesk.Viewing.ToolInterface {
    constructor() {
        super();
        this.names = ['gis-tool'];
 
        // Hack: delete functions defined *on the instance* of the tool.
        // We want the tool controller to call our class methods instead.
        delete this.register;
        delete this.deregister;
        delete this.activate;
        delete this.deactivate;
        delete this.getPriority;
        delete this.handleSingleClick;
    }
 
    register() {      
      console.log('GisTool registered.');
    }
 
    deregister() {
      this.viewer.unloadExtension('Autodesk.Geolocation');
      this.geoTool = null;
      console.log('GisTool unregistered.');
    }
 
    async activate(name, viewer) {
      this.viewer = viewer;
      this.geoTool = await this.viewer.loadExtension('Autodesk.Geolocation');

      if (!this.geoTool.hasGeolocationData())
        alert( 'No GIS data found in current model' );

      console.log('GisTool activated.');
    }
 
    deactivate(name) {
      console.log('GisTool deactivated.');
    }
 
    getPriority() {
      return 1; // Or feel free to use any number higher than 0 (which is the priority of all the default viewer tools)
    }
 
    handleSingleClick(event, button) {
      if (button === 0 ) {
        // const hitPoint = this._intersect(event.clientX, event.clientY);
        // const geolocation = this.geoTool.lmvToLonLat(hitPoint);
        const canvasX = event.canvasX;
        const canvasY = event.canvasY;
        const res = this.viewer.clientToWorld(canvasX, canvasY);
        const geolocation = this.geoTool.lmvToLonLat(res.point);
        console.log(JSON.stringify(res.point));
        console.log(JSON.stringify(geolocation)); //!<<< the geolocation you want
        return true; // Stop the event from going to other tools in the stack
      }
      // Otherwise let another tool handle the event
      return false;
    }

    _intersect(clientX, clientY) {
      return this.viewer.impl.intersectGround(clientX, clientY);
    }
  }
    
  
    // export default class GisToolExtension extends Autodesk.Viewing.Extension {
        
    //   constructor(viewer, options) {
    //     super(viewer, options);
    //     this.tool = new GisTool();
    //     this.group = null;
    //     this.button = null;
    //   }
   
    //   load() {
    //     this.viewer.toolController.registerTool(this.tool);
    //     console.log('GisToolExtension loaded.');
    //     var loader = new Loader();
    //     loader.start
    //     return true;
    //   }
   
    //   unload() {
    //     this.viewer.toolController.deregisterTool(this.tool);
    //     console.log('GisToolExtension unloaded.');
    //     return true;
    //   }
   
    //   onToolbarCreated() {
    //     this.group = this.viewer.toolbar.getControl('allMyAwesomeExtensionsToolbar');
    //     if (!this.group) {
    //         this.group = new Autodesk.Viewing.UI.ControlGroup('allMyAwesomeExtensionsToolbar');
    //         this.viewer.toolbar.addControl(this.group);
    //     }

    //     const controller = this.viewer.toolController;

    //     //Adding a button
    //     this.button = new Autodesk.Viewing.UI.Button('gis-tool-button');
    //     this.button.onClick = (ev) => {
    //         const isActivated = controller.isToolActivated('gis-tool');
    //         if (isActivated) {
    //           controller.deactivateTool('gis-tool');
    //           this.button.setState(Autodesk.Viewing.UI.Button.State.INACTIVE);
    //         } else {
    //             controller.activateTool('gis-tool');
    //             this.button.setState(Autodesk.Viewing.UI.Button.State.ACTIVE);
    //         }
    //     };
    //     this.button.setToolTip('GIS Tool');
    //     this.button.addClass('connectCadmiumIcon');
    //     // this.group = new Autodesk.Viewing.UI.ControlGroup('gis-tool-group');
    //     this.group.addControl(this.button);
    //     // toolbar.addControl(this.group);
    //   }
    // }
    // Autodesk.Viewing.theExtensionManager.registerExtension('GisToolExtension', GisToolExtension);
