'use strict';

import State from "./state.js";

export default class StateCA extends State { 

	constructor(models, size) {
		super(models);
		
		this.size = size;
	}
	
	Clone() {
		var clone = new StateCA([0, 0, 0], null);
		
		clone.i = this.i;
		clone.size = JSON.parse(JSON.stringify(this.size));
		clone.models = this.models.map(m => m.Clone());
		clone.data = JSON.parse(JSON.stringify(this.data));
		
		return clone;
	}
	
	GetValue(emitter) {
		return this.data[emitter[0]][emitter[1]][emitter[2]];
	}

	ApplyMessage(m) {		
		for (var f in m.Value) this.data[m.X][m.Y][m.Z][f] = m.Value[f];
	}
		
	Reset() {
		this.data = [];
		
		// TODO : Is this always 0?? Is there always only one model in Cell-DEVS?
		var m = this.models[0];
		
		for (var x = 0; x < this.size[0]; x++) {
			this.data[x] = [];
			
			for (var y = 0; y < this.size[1]; y++) {
				this.data[x][y] = [];
				
				for (var z = 0; z < this.size[2]; z++) {
					var d = {};
					
					m.Template.forEach(f => d[f] = 0);
					
					this.data[x][y][z] = d;
				}
			}
		}
	}
}