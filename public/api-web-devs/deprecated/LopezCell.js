'use strict';

import Core from '../tools/core.js';
import Parser from "./parser.js";

import { Simulation, TransitionsCA, TransitionCA, Options, Files } from './files.js';

import Settings from '../components/settings.js';
import Scale from '../components/scales/basic.js';
import State from '../simulation/state.js';

export default class LopezCell extends Parser { 
	
	Parse(files) {
		var d = Core.Defer();
		
		var pal = files.find(function(f) { return f.name.match(/\.pal/i); });
		var ma = files.find(function(f) { return f.name.match(/\.ma/i); });
		var log = files.find(function(f) { return f.name.match(/\.log/i); });

		if (!ma || !log) {
			d.Reject(new Error("A model (.ma) and a log (.log) file must be provided for the CD++ Cell-DEVS parser."));
		
			return d.promise;
		}
		
		var name = ma.name.substr(0, ma.name.length - 3);
		
		var p1 = this.Read(pal, this.ParsePalFile.bind(this));
		var p2 = this.Read(ma, this.ParseMaFile.bind(this));
		var p3 = this.ReadByChunk(log, this.ParseLogChunk.bind(this));
		
		var defs = [p1, p2, p3];
		
		Promise.all(defs).then((data) => {			
			if (!data[2]) return d.Reject(new Error("Unable to parse the log (.log) file."));
			
			var simulation = new Simulation(name, "Lopez", "Cell-DEVS", data[1].models, data[1].size);
			var transitions = new TransitionsCA(data[2]);
			
			var options = Settings.Default(data[1].size[2], data[1].models[0].ports);

			options.grid.styles.push(data[0]);
			
			var files = new Files(simulation, transitions, null, new Options(options));
			
			d.Resolve(files);
		}, (error) => {
			d.Reject(error);
		});
		
		return d.promise;
	}
	
	ParseMaFile(file) {		
		var ma = {
			size : [0, 0, 1],
			models : []
		}
		
		var lines = file.trim().split(/\r\n|\n/);
		
		lines.forEach(l => {
			var d = l.split(":").map(d => d.trim());
			
			if (d.length < 2) return;
			
			// assumes format is => components : model1, model2
			if (d[0] == "components") {
				ma.models = d[1].replace(/ /g, "").split(",").map(m => {
					return {
						name : m.toLowerCase(),
						ports : []
					}
				});	
			}
			
			else if (d[0] == "dim") {
				var s = d[1].slice(1,-1).split(",");
			
				ma.size = [+s[0], +s[1], +s[2] || 1];
			}
			
			else if (d[0] == "height") ma.size[0] = +d[1];
			
			else if (d[0] == "width") ma.size[1] = +d[1];

			// TODO : Always one model?
			else if (d[0] == "NeighborPorts")  ma.models[0].ports = d[1].trim().split(" ");
		});
		
		ma.models[0].ports = ma.models[0].ports.map(p => { 
			return {
				name : "out_" + p,
				type : "output",
				style : 0
			} 
		});
		
		ma.models[0].ports.unshift({ name:"out", type:"output", style:0 });
		
		return ma;
	}
	
	ParsePalFile(file) {	
		var lines = file.trim().split(/\n/);
		
		if (lines[0].indexOf('[') != -1) return this.ParsePalTypeA(lines);
		
		else return this.ParsePalTypeB(lines);
	}	
		
	ParseLogChunk(parsed, chunk) {		
		var pattern = '0 / L / Y /';
		var start = chunk.indexOf(pattern, 0);		
		
		while (start > -1) {
			start = start + pattern.length;
		
			var end = chunk.indexOf('\n', start);
			
			if (end == -1) end = chunk.length + 1;
			
			var length = end - start;
			
			var split = chunk.substr(start, length).split("/");
			var start = chunk.indexOf(pattern, start + length);
			
			// Parse coordinates, state value & frame timestamp
			// NOTE : Don't use regex, it's super slow.
			var tmp1 = split[1].trim().split("(")
			var tmp2 = split[3].trim().split(/\s|\(/g);
			
			var m = tmp1[0];					// model name
			var t = split[0].trim();								// time
			var c = tmp1[1].slice(0, -1).split(",").map(d => +d);	// id / coordinate
			var p = split[2].trim();								// port
			var v = parseFloat(split[3]);							// value
			
			var tmp = split.length == 5 ? split[4] : split[5]	// Weird case, there seems to be two formats, one of them as an extra / (see life 1 and life 2)
						
			parsed.push(new TransitionCA(t, m, c, p, v));
			
		};
		
		return parsed;
	}
	
	ParsePalTypeA(lines) {		
		// Type A: [rangeBegin;rangeEnd] R G B
		var scale = new Scale();
		
		lines.forEach(function(line) { 
			// skip it it's probably an empty line
			if (line.length < 7) return;
			
			var start = parseFloat(line.substr(1));
			var end   = parseFloat(line.substr(line.indexOf(';') + 1));
			var rgb = line.substr(line.indexOf(']') + 2).trim().split(' ');
			
			// clean empty elements
			for (var j = rgb.length; j-- > 0;) {
				if (rgb[j].trim() == "") rgb.splice(j, 1);
			}			
			
			// Parse as decimal int
			var r = parseInt(rgb[0], 10);
			var g = parseInt(rgb[1], 10);
			var b = parseInt(rgb[2], 10);
			
			scale.AddClass(start, end, [r, g, b]);
		});
		
		return scale.ToJson();
	}
	
	ParsePalTypeB(lines) {
		// Type B (VALIDSAVEFILE: lists R,G,B then lists ranges)
		var scale = new Scale();
		
		var paletteRanges = [];
		var paletteColors =[];
		
		for (var i = lines.length; i-->0;){
			// check number of components per line
			var components = lines[i].split(',');
			
			if(components.length == 2) {
			// this line is a value range [start, end]
				// Use parseFloat to ensure we're processing in decimal not oct
				paletteRanges.push([parseFloat(components[0]), parseFloat(components[1])]); 
			}
			else if (components.length == 3){ 
			// this line is a palette element [R,G,B]
				// Use parseInt(#, 10) to ensure we're processing in decimal not oct
				paletteColors.push([parseInt(.95*parseInt(components[0],10)), 
									parseInt(.95*parseInt(components[1],10)), 
									parseInt(.95*parseInt(components[2],10))]); 
			}
		}

		// populate grid palette object
		for (var i = paletteRanges.length; i-- > 0;){	
			scale.AddClass(paletteRanges[i][0], paletteRanges[i][1], paletteColors[i]);
		}
		
		return scale.ToJson();
	}
}
