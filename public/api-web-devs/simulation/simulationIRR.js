'use strict';

import Simulation from './simulation.js';
import Message from './message.js';
import State from './state.js';
import Model from './model.js';

export default class SimulationIRR extends Simulation { 
	
	constructor(name, simulator, type, models) {
		super(name, simulator, type, models);
		
		this.state = new State(this.Models);
	}
	
	EachMessage(delegate) {
		for (var i = 0; i < this.Frames.length; i++) {
			var f = this.Frames[i];
			
			for (var j = 0; j < f.StateMessages.length; j++) {
				var t = f.StateMessages[j];
				
				delegate(t, f);
			}
		}
	}
	
	static FromJson(json, messages, fields) {
		var info = json.info;
		var models = json.models.map(m => Model.FromJson(m));
		var simulation = new SimulationIRR(info.name, info.simulator, info.type, models);
				
		// Add frames from flat messages list			
		for (var i = 0; i < messages.length; i++) {
			var m = messages[i];
			
			for (var f in m.value) {
				var v = m.value[f];
				
				m.value[f] = isNaN(+v) ? v : +v;
			}

			var emitter = simulation.Model(m.model);
			var message = new Message(emitter, m.value);
						
			simulation.AddStateMessage(m.time, message);
		}
		
		return simulation;		
	}
}
