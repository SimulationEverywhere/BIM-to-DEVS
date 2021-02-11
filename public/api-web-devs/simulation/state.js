'use strict';

export default class State { 

	constructor(models) {
		this.i = -1;
		this.data = null;
		this.models = models || [];
		this.size = this.models.length;
	}
	
	Clone() {
		var clone = new State([]);
		
		clone.i = this.i;
		clone.models = this.models.map(m => m.Clone());
		clone.data = JSON.parse(JSON.stringify(this.data));

		return clone;
	}
	
	GetValue(emitter) {
		if (!this.data.hasOwnProperty(emitter.Name)) return null;
		
		return this.data[emitter.Name] || null;
	}
	
	ApplyMessages(frame) {
		for (var i = 0; i < frame.StateMessages.length; i++) {
			this.ApplyMessage(frame.StateMessages[i]);
		}
	}

	ApplyMessage(m) {
		if (!this.data.hasOwnProperty(m.Emitter.Name)) return;
		
		for (var f in m.Value) this.data[m.Emitter.Name][f] = m.Value[f];
	}
	
	Forward(frame) {
		this.ApplyMessages(frame);
		
		this.i++;
	}
	
	Backward(frame) {
		this.ApplyMessages(frame);
		
		this.i--;
	}
		
	Reset() {
		this.data = {};
		
		this.models.forEach((m) => {			
			var d = {};
			
			m.Template.forEach(f => d[f] = 0);
			
			this.data[m.Name] = d;
		});
	}
}