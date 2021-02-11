'use strict';

export default class Message { 
			
	constructor(emitter, value) {
		this.emitter = emitter;
		this.value = value;
		this.diff = null;
	}
	
	get Emitter() { return this.emitter; }

	get Value() { return this.value; }
	
	get Diff() { return this.diff; }
	
	set Diff(value) { this.diff = value; }

	GetDiff() {
		var d = {};
		
		for (var f in this.value) d[f] = this.value[f] - this.diff[f];
		
		return d;
	}
	
	Difference(v) {
		if (v === undefined || v === null) return;
		
		this.Diff = {};
		
		for (var f in this.Value) this.Diff[f] = this.Value[f] - v[f];
	}
	
	Reverse() {		
		// TODO: Only place where we use GetDiff I think.		
		return new Message(this.emitter, this.GetDiff());
	}

	static FromCsv(csv) {
		return new Message(csv.emitter, csv.value);
	}
}