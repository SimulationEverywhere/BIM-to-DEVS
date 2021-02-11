'use strict';

import Evented from '../components/evented.js';
import Port from './port.js';
import Link from './link.js';

export default class Model { 
    	
	get Name() { return this.name; }

	get Type() { return this.type; }
	
	get Ports() { return this.ports; }
	
	get Links() { return this.links; }
	
	get SVG() { return this.svg; }
	
	set SVG(value) { this.svg = value; }
	
	get Template() { return this.template; }

	constructor(name, type, ports, links, svg, template) {
        this.name = name;
        this.type = type;
        this.ports = ports || [];
        this.links = links || [];
        this.svg = svg || [];
        this.template = template || [];
    }
    
	Clone() {
		var ports = this.Ports.map(p => p.Clone());
		var links = this.Links.map(l => l.Clone());
		var svg = this.SVG.map(s => s);
		
		return new Model(this.Name, this.Type, ports, links, svg, this.Template);
	}
	
	Port(name) {
		return this.Ports.find(p => p.Name == name) || null;
	}
	
	PortLinks(port) {
		return this.Links.filter(l => l.PortA.Name == port.Name);
	}
	
	OutputPath(port) {
		var svg = this.SVG.concat(port.SVG);
		var links = this.PortLinks(port);
		
		for (var i = 0; i < links.length; i++) {
			var l = links[i];
			
			svg = svg.concat(l.SVG);
			svg = svg.concat(l.PortB.SVG);			
			svg = svg.concat(l.ModelB.SVG);
			
			if (l.ModelB.Type == "atomic") continue;
			
			// TODO : Not sure this works.
			links = links.concat(l.ModelB.PortLinks(l.PortB));
		}
		
		return svg;
	}

	static FromJson(json) {
		if (json.ports) var ports = json.ports.map(p => Port.FromJson(p));
		if (json.links) var links = json.links.map(l => Link.FromJson(l));
		
		return new Model(json.name, json.type, ports, links, json.svg, json.template);
	}
}