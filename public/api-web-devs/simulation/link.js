'use strict';

import Evented from '../components/evented.js';

export default class Link { 
	get PortA() { return this.portA; }
	
	set PortA(value) { this.portA = value; }
	
	get PortB() { return this.portB; }
	
	set PortB(value) { this.portB = value; }
	
	get ModelB() { return this.modelB; }
	
	set ModelB(value) { this.modelB = value; }
	
	get SVG() { return this.svg; }
	
	set SVG(value) { this.svg = value; }

	constructor(portA, portB, modelB, svg) {
		this.portA = portA;
		this.portB = portB;
		this.modelB = modelB;
		this.svg = svg || [];
	}
    
	Clone() {
		var svg = this.SVG.map(s => s);
		
		return new Link(this.PortA, this.PortB, this.ModelB, svg);
	}
	
	static FromJson(json) {
		return new Link(json.portA, json.portB, json.modelB, json.svg);
	}
}