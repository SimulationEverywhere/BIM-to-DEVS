'use strict';

import Simulation from './simulation.js';
import MessageCA from './messageCA.js';
import StateCA from './stateCA.js';
import Model from './model.js';

export default class SimulationCA extends Simulation { 
	
	get Size() { return this.size; }
	
	get Dimensions() {  return { x:this.size[0], y:this.size[1], z:this.size[2] }}
	
	get Ratio() { return this.Dimensions.x / this.Dimensions.y; }
	
	get MaxX() { return this.size[0] }
	
	get MaxY() { return this.size[1] }
	
	get MaxZ() { return this.size[2] }
	
	constructor(name, simulator, type, models, size) {
		super(name, simulator, type, models);
		
		this.size = size || null;
		
		this.state = new StateCA(this.Models, size);
	}
	
	get Ports() {
		// TODO : Is this always 0?? Is there always only one model in Cell-DEVS?
		return this.Models[0].Ports.map(p => p.Name);
	}
	
	get Layers() {
		var layers = [];
		
		for (var i = 0; i < this.MaxZ; i++) layers.push(i);
		
		return layers;
	}
	
	static FromJson(json, messages) {
		var info = json.info;
		var models = json.models.map(m => Model.FromJson(m));
		
		// TODO : This is awkward, do Cell-DEVS models always have a single model?
		var size = json.models[0].size;
		var simulation = new SimulationCA(info.name, info.simulator, info.type, models, size);
		
		// Add frames from flat messages list			
		for (var i = 0; i < messages.length; i++) {			
			var m = messages[i];
			var message = new MessageCA(m.cell, m.value);
						
			simulation.AddStateMessage(m.time, message);
		}
		
		return simulation;
	}
}