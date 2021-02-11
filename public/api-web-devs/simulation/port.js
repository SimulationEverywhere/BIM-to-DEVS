'use strict';

import Evented from '../components/evented.js';

export default class Port { 
	get Name() { return this.name; }
	
	get Type() { return this.type; }
	
	get SVG() { return this.svg; }
	
	set SVG(value) { this.svg = value; }

	get Model() { return this.model; }

	set Model(value) { this.model = value; }

	get Template() { return this.template; }

	constructor(name, type, svg, template) {
		this.name = name;
		this.type = type;
		this.svg = svg || [];
        this.template = template || null;
	}
    
	Clone() {
		var svg = this.SVG.map(s => s);
		
		return new Port(this.Name, this.Type, svg, this.Template);
	}
	
	static FromJson(json) {
		return new Port(json.name, json.type, json.svg, json.template);
	}
}