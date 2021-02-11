'use strict';

import Core from '../tools/core.js';
import Dom from '../tools/dom.js';
import Templated from '../components/templated.js';

import DiagramAuto from './diagram/auto.js'
import Diagram from './diagram/diagram.js';
import GridAuto from './grid/auto.js'
import Grid from './grid/grid.js';

export default Core.Templatable("Widget.MultiView", class MultiView extends Templated { 

	get Canvas() {
		return (this.Type == "DEVS") ? this.Widget("diagram").Canvas : this.Widget("grid").Canvas;
	}

	set Size(value) {
		this.Elem("viz").style.width = value.width + "px";
		this.Elem("viz").style.height = value.height + "px";	
	}
	
	get Size() {
		return {
			width: this.Elem("viz").style.width,
			height: this.Elem("viz").style.height
		}
	}

	get Type() {
		return this.simulation.type;
	}

	get AutoSize() {
		// TODO : Maybe should be done by view (diagram or grid) widget
		if (this.Type == "DEVS") {
			return this.settings.DiagramSize(this.simulation);
		}
		else if (this.Type == "Cell-DEVS") {
			var n = this.Widget("grid").layers.length;
			
			return this.settings.CanvasSize(this.simulation, n);
		}
	}

	set Settings(value) {
		this.settings = value;
		
		this.settings.On("Change", this.OnSettings_Change.bind(this));
	}
	
	set Simulation(value) {
		this.simulation = value;
	}

	constructor(node) {
		super(node);
		
		this.type = null;
		this.view = null;
	}
	
	Initialize(simulation, settings) {
		this.Clear();
		
		this.Simulation = simulation;
		this.Settings = settings;
		
		Dom.SetCss(this.Elem("viz"), `viz-container ${this.Type}`);
		
		// TODO : Maybe just pass settings to auto, not sure what to do with clickEnabled though
		if (this.Type == "DEVS") {			
			var options = {
				clickEnabled:false
			}
			
			this.view = new DiagramAuto(this.Widget("diagram"), this.simulation, options);
		}
		else if (this.Type === "Cell-DEVS") {
			var options = { 
				clickEnabled:false,
				columns:this.settings.Get("grid", "columns"), 
				spacing:this.settings.Get("grid", "spacing"), 
				layers:this.settings.Get("grid", "layers") || this.LayersAndPorts(this.simulation), 
				styler:this.settings.styler
			}
			
			this.view = new GridAuto(this.Widget("grid"), this.simulation, options);
		}
		else {
			this.Elem("viz").style.width = null;
			this.Elem("viz").style.height = null;
		}
	}
	
	LayersAndPorts(simulation) {
		var layers = [];
			
		simulation.Layers.forEach(z => {
			simulation.Ports.forEach(port => {
				layers.push({ z:z, ports:[port] });
			}); 
		})
		
		return layers;
	}
	
	OnSettings_Change(ev) {
		if (["height", "width", "columns", "spacing", "aspect", "layers"].indexOf(ev.property) == -1) return;
		
		this.Widget("grid").Columns = this.settings.Get("grid", "columns");
		this.Widget("grid").Spacing = this.settings.Get("grid", "spacing");
		this.Widget("grid").Layers = this.settings.Get("grid", "layers");
		this.Widget("grid").Styler = this.settings.styler;

		this.Resize();
		this.Redraw();
	}
	
	Redraw() {
		this.view.Redraw();
	}
	
	Resize() {		
		this.Size = this.AutoSize;
	}
	
	Clear() {
		if (this.view) {			
			this.view.Destroy();
			this.view = null;
		}
	}
	
	Template() {
		return "<div handle='viz' class='viz-container'>" +
				   "<div handle='diagram' widget='Widgets.Diagram' class='diagram-widget-container'></div>" +
				   "<div handle='grid' widget='Widgets.Grid' class='grid-widget-container'></div>" +
			   "</div>";
	}
});