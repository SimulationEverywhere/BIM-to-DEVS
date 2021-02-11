'use strict';

import Core from '../tools/core.js';
import Parser from "./parser.js";

import { Simulation, TransitionDEVS, TransitionsDEVS, Diagram, Options, Files } from './files.js';

import Settings from '../components/settings.js';

export default class CDppDEVS extends Parser { 
		
	Parse(files) {
		var d = Core.Defer();

		var ma = files.find(function(f) { return f.name.match(/.ma/i); });
		var svg = files.find(function(f) { return f.name.match(/.svg/i); });
		var log = files.find(function(f) { return f.name.match(/.log/i); });

		if (!ma || !log) {
			d.Reject(new Error("A model (.ma) and a log (.log) file must be provided for the CD++ DEVS parser."));
		
			return d.promise;
		}
		
		var name = log.name.substr(0, log.name.length - 4);

		this.Read(ma, this.ParseMaFile.bind(this)).then((ma) => {
			this.simulation = new Simulation(name, "CDpp", "DEVS", ma.models, ma.size);
			
			var p1 = this.Read(svg, this.ParseSVGFile.bind(this));
			var p2 = this.ReadByChunk(log, this.ParseLogChunk.bind(this));
			var defs = [p1, p2];
		

			Promise.all(defs).then((data) => {
				var svg = data[0];
				var log = data[1];
				if (!svg) return d.Reject(new Error("Unable to parse the model (.svg) file."));
				if (!log) return d.Reject(new Error("Unable to parse the log (.log) file or it contained no X and Y messages."));

				var transitions = new TransitionsDEVS(log);
				var diagram = new Diagram(svg);
				var options = new Options(Settings.Default());
				
				var files = new Files(this.simulation, transitions, diagram, options);

				d.Resolve(files);
			}, (error) => {
				d.Reject(error);
			});
		});

		return d.promise;
	}

	ParseMaFile(file) {		
		var blocks = file.trim().slice(1).split("\n[");
		var links = [];
		
		// This is messy but due to the structure of ma files
		var models = blocks.map(b => {		
			var model = { name:null, type:null, submodels:[], ports:[], links:[], svg:[] }
		
			b.trim().split("\n").forEach((l, i) => {
				l = l.trim().toLowerCase();
				
				if (i == 0) model.name = l.substr(0, l.length - 1);
				
				else if (l.startsWith("components")) {
					model.submodels.push(l.split(/\s|@/)[2]);
				}
				
				else if (l.startsWith("link")) {
					var ports = l.split(/\s/).slice(2);
					var left = ports[0].split(/@/);
					var right = ports[1].split(/@/);
					
					var modelA = left[1] || model.name;
										
					links.push({
						modelA : left[1] || model.name,
						portA : left[0],
						portB : right[0],
						modelB : right[1] || model.name
					});
				}
			});
			
			model.type = (model.submodels.length > 0) ? "coupled" : "atomic";
			
			return model;
		});
		
		links.forEach(l => {
			var mA = models.find(m => m.name == l.modelA);
			var pA = mA.ports.find(p => p.name == l.portA);
			
			if (!pA) mA.ports.push({ name:l.portA, type:"output", svg:[] });
			
			var mB = models.find(m => m.name == l.modelB);
			var pB = mB.ports.find(p => p.name == l.portB);
			
			if (!pB) mB.ports.push({ name:l.portB, type:"input", svg:[] });
			
			mA.links.push({ portA:l.portA, portB:l.portB, modelB:l.modelB, svg:[] });
		});
		
		return {
			size : models.length,
			models : models,
			links : links
		}
	}
	
	ParseSVGFile( file) {	
		return file;
	}
	
	ParseLogChunk(parsed, chunk) {	
		var pattern = 'Mensaje Y';
		var start = chunk.indexOf(pattern, 0);	
		
		while (start > -1) {
			start = start + pattern.length;
			
			var end = chunk.indexOf('\n', start);
			
			if (end == -1) end = chunk.length + 1;
			
			var length = end - start;
						
			var split = chunk.substr(start, length).split('/');
			var start = chunk.indexOf('Mensaje Y', start + length);

			// Parse coordinates, state value & frame timestamp
			// NOTE : Don't use regex, it's super slow.
			var tmp1 = split[2].trim().split("(");
			var tmp2 = split[4].trim().split(" ");
			
			var m = tmp1[0];					// model name
			
			if (this.ModelType(m) == 'coupled') continue;
			
			var t = split[1].trim();			// time
			var c = tmp1[1].slice(0, -1);		// id / coordinate
			var p = split[3].trim();			// port
			var v = parseFloat(split[4]);		// value
			
			parsed.push(new TransitionDEVS(t, m, p, v));
		}
		
		return parsed;
	}
	
	ModelType(model) {
		var m = this.simulation.content.models.find(m => m.name == model);
		
		return m.type;
	}
}