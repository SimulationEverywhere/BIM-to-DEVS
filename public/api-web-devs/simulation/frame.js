'use strict';

export default class Frame { 

	get Messages() { return this.messages; }

	get OutputMessages() { return this.Messages.output; }

	get StateMessages() { return this.Messages.state; }
	
	get Time() { return this.time; }
	
	constructor(time) {
		this.time = time;
		
		this.messages = {
			output : [],
			state : []
		}
	}
	
	AddMessage(m, type) {
		this.Messages[type].push(m);
	}
	
	AddOutputMessage(m) {
		return this.AddMessage(m, "output");
	}
	
	AddStateMessage(m) {
		return this.AddMessage(m, "state");
	}
	
	Reverse () {
		var reverse = new Frame(this.time);
		
		for (var i = 0; i < this.StateMessages.length; i++) {
			var m = this.StateMessages[i];
			
			reverse.AddStateMessage(m.Reverse());
		}
		
		return reverse;
	}
	
	Difference(state) {
		for (var i = 0; i < this.StateMessages.length; i++) {
			var m = this.StateMessages[i];			
			var v = state.GetValue(m.Emitter);
			
			m.Difference(v);
		}
	}
}