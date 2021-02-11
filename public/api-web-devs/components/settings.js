'use strict';

import Evented from '../components/evented.js';
import Styler from './styler.js';

export default class Settings extends Evented { 

	set json(value) {
		this._json = value;

		if (value.grid.styles.length == 0) return;
	
		this._styler = Styler.FromJson(value.grid.styles);
	}
	
	set styler(value) {
		this._styler = value;
		
		this._json.grid.styles = value.ToJson();
	}
	
	get styler() { return this._styler; }

	get json() { return this._json; }

	set layers (values) { this.json.grid.layers = value; }
	
	get layers () { return this.json.grid.layers; }

	constructor() {
		super();
		
		this._styler = null;
		
		this.json = Settings.Default();
	}
		
	CanvasSize(simulation, nGrids) {
		nGrids = nGrids || simulation.Dimensions.z;
		
		var aspect = this.Get("grid", "aspect");
		var space = this.Get("grid", "spacing");
		var cols = this.Get("grid", "columns");
		var rows = Math.ceil(nGrids / cols);
		var width = this.Get("grid", "width");
		var height = this.Get("grid", "height");
		
		if (aspect) height = width / simulation.Ratio;
		
		width = (cols * width + space * cols - space);
		height = (rows * height + rows * space - space);
		
		return { width : width, height : height }
	}
	
	DiagramSize(simulation) {		
		var aspect = this.Get("diagram", "aspect");
		var width = this.Get("diagram", "width");
		var height = this.Get("diagram", "height");
		
		if (aspect) height = width / simulation.Ratio;
		
		return { width : width, height : height }
	}
		
	Get(group, property) {
		return this.json[group][property];
	}
	
	Set(group, property, value) {
		var change = this.Silent(group, property, value);
		
		this.Emit("Change", change);
	}
	
	Silent(group, property, value) {
		this.json[group][property] = value;
		
		return { group:group, property:property, value:value }
	}
	
	ToString() {
		return JSON.stringify(this.json);
	}
	
	ToFile() {
		var content = this.ToString();
		
		return new File([content], "options.json", { type:"application/json", endings:'native' });
	}
	
	static FromJson(json) {
		var settings = new Settings();
		
		settings.json = json;
		
		return settings;
	}
	
	static FromSimulation(simulation) {
		var options = Settings.Default();
		
		if (simulation.type == "DEVS") return Settings.FromJson(options);
		
		options.grid.layers = Settings.DefaultLayers(simulation.MaxZ, simulation.Ports);
		
		options.grid.columns = Settings.DefaultColumns(options.grid.layers);

		return Settings.FromJson(options);
	}
	
	static Default() {		
		return {
			diagram : {
				width : 600,
				height : 400,
				aspect : true
			},
			grid : {
				columns : 1,
				width : 350,
				height : 350,
				spacing : 10,
				showGrid : false,
				aspect : true,
				layers : [],
				styles : []
			},
			playback : {
				speed : 10,
				loop : false,
				cache : 10
			}
		}
	}
	
	static DefaultLayers(maxZ, ports) {
		var layers = [];
		
		for (var i = 0; i < maxZ; i++) {
			ports.forEach(p => {				
				layers.push({ z:i, ports:[p], style:0, position:layers.length });
			});
		}
		
		return layers;
	}
	
	static DefaultColumns(layers) {		
		return (layers.length > 3) ? 3 : layers.length;	
	}
}
