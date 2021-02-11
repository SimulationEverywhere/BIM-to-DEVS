'use strict';

import Message from './message.js';

export default class MessageCA extends Message { 
	
	constructor(emitter, value) {		
		super(emitter, value);
		
		this.emitter = emitter.map(c => +c);
	}
	
	get Id() {
		return this.emitter.join("-");
	}
	
	get X() {
		return this.emitter[0];
	}

	get Y() {
		return this.emitter[1];
	}
	
	get Z() {
		return this.emitter[2];
	}
	
	Reverse() {		
		// TODO: Only place where we use GetDiff I think.		
		return new MessageCA(this.emitter, this.GetDiff());
	}
	
	static FromCsv(csv) {
		return new MessageCA(csv.emitter, csv.value);
	}
}