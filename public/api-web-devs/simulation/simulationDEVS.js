'use strict';

import Dom from '../tools/dom.js';
import Simulation from './simulation.js';
import Frame from './frame.js';
import Message from './message.js';
import State from './state.js';
import Model from './model.js';

export default class SimulationDEVS extends Simulation { 
	
	get Diagram() { return this.diagram; }
	
	get Ratio() { 	
		var vb = this.Diagram.getAttribute("viewBox")
		
		if (!vb) throw new Error("The viewBox attribute must be specified on the svg element.");

		var split = vb[1].split(" ");
		
		return split[2] / split[3];
	}
	
	get SVG() { return this.svg; }
	
	constructor(name, simulator, type, models, diagram) {
		super(name, simulator, type, models);
		
		this.BuildModels();
				
		if (diagram) this.LoadSVG(diagram);
		
		this.state = new State(this.Models);
	}
	
	BuildModels() {
		this.Models.forEach(m => {
			m.Ports.forEach(p => p.Model = m);
			
			m.Links.forEach(l => {
				l.ModelB = this.Model(l.ModelB);
				l.PortB = this.Port(l.ModelB.Name, l.PortB);
				l.PortA = this.Port(m.Name, l.PortA);				
			});
		});
	}
	
	LoadSVG(svg) {		
		var root = Dom.Create("div", { innerHTML:svg });
		
		this.Models.forEach(model => {			
			model.SVG = model.SVG.map(s => root.querySelector(s)).filter(s => s != null);		
			
			model.Ports.forEach(port => {
				port.SVG = port.SVG.map(s => root.querySelector(s)).filter(s => s != null);
			});
			
			model.Links.forEach(link => {
				link.SVG = link.SVG.map(s => root.querySelector(s)).filter(s => s != null);
			});
		});
		
		this.diagram = root.children[0];
	}
	
	static FromJson(json, messages, diagram) {
		var info = json.info;
		var models = json.models.map(m => Model.FromJson(m));
		var simulation = new SimulationDEVS(info.name, info.simulator, info.type, models, diagram);
		
		// Add frames from flat messages list			
		for (var i = 0; i < messages.length; i++) {
			var m = messages[i];
			var emitter = simulation.Port(m.model, m.port);
			var message	= new Message(emitter, m.value);		
			
			simulation.AddOutputMessage(m.time, message);
		}
		
		return simulation;		
	}
}