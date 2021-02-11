'use strict';

import Core from '../tools/core.js';
import Parser from "./parser.js";

import { Simulation, TransitionsCA, TransitionCA, Options, Files } from './files.js';

import Settings from '../components/settings.js';
import Scale from '../components/scales/basic.js';
import State from '../simulation/state.js';

export default class CDpp extends Parser { 
	
	Parse(files) {
		var d = Core.Defer();
		
		var val = files.find(function(f) { return f.name.match(/\.val/i); });
		var pal = files.find(function(f) { return f.name.match(/\.pal/i); });
		var ma = files.find(function(f) { return f.name.match(/\.ma/i); });
		var log = files.find(function(f) { return f.name.match(/\.log/i); });
		
		if (!ma || !log) {
			d.Reject(new Error("A model (.ma) and a log (.log) file must be provided for the CD++ Cell-DEVS parser."));
		
			return d.promise;
		}
		
		var name = ma.name.substr(0, ma.name.length - 3);
		
		var p1 = this.Read(val, this.ParseValFile.bind(this));
		var p2 = this.Read(pal, this.ParsePalFile.bind(this));
		var p3 = this.Read(ma, this.ParseMaFile.bind(this));
		var p4 = this.ReadByChunk(log, this.ParseLogChunk.bind(this));
		
		var defs = [p1, p2, p3, p4];
	
		Promise.all(defs).then((data) => {		
			var val = data[0];
			var ma = data[2];
			
			if (!data[2]) return d.Reject(new Error("Unable to parse the model (.ma) file."));
			
			if (!data[3]) return d.Reject(new Error("Unable to parse the log (.log) file or it contained no X and Y messages."));
			
			// Other simulators probably don't have to merge, CDpp-Cell-DEVS is complicated (val, global value, initial value, row value, etc.)
			var initial = this.MergeFrames(ma.initial.global, ma.initial.rows);
			
			if (val) initial = this.MergeFrames(initial, val);
			
			initial.forEach(t => {
				t.model = ma.models[0].name;		// TODO : Can there be more than one model?
			});
			
			var simulation = new Simulation(name, "CDpp", "Cell-DEVS", ma.models, ma.size);	
			var transitions = new TransitionsCA(initial.concat(data[3]));
			
			var options = Settings.Default(simulation.content.size[2], simulation.content.models[0].ports);
			
			options.grid.styles.push(data[1]);
			
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
			initial : {
				global : [],
				rows : []
			}			
		}
		
		var lines = file.trim().split(/\r\n|\n/);
		
		lines.forEach(l => {
			var d = l.split(":").map(d => d.trim());
			
			if (d.length < 2) return;
			
			// assumes format is => components : model1, model2
			if (d[0] == "components") ma.models = d[1].replace(/ /g, "").split(",").map(m => m.toLowerCase());	
			
			else if (d[0] == "dim") {
				var s = d[1].slice(1,-1).split(",");
			
				ma.size = [+s[0], +s[1], +s[2] || 1];
			}
			
			else if (d[0] == "height") ma.size[0] = +d[1];
			
			else if (d[0] == "width") ma.size[1] = +d[1];
			
			else if (d[0] == "initialvalue") ma.initial.global = this.GlobalFrame(ma.size, +d[1]);
			
			else if (d[0] == "initialrowvalue") ma.initial.rows = this.RowsFrame(d[1]);
		});
		
		ma.models = ma.models.map(m => {  
			return { name:m, ports:[{ name:"out", type:"output", style:0 }] }
		});
		
		return ma;
	}
	
	ParseValFile(file) {
		var data = [];

		// Each line looks like this: (y,x,z)=value
		file.trim().split(/\n/).forEach(function(line) {
			line = line.trim();
			
			if (line.length < 4) return; // probably empty line
			
			var cI = line.indexOf('('); // coordinate start
			var cJ = line.indexOf(')'); // coordinate end
			var vI = line.indexOf('='); // value start
			
			var c = line.substring(cI + 1, cJ).replace(/\s/g, "").split(",").map(d => +d);

			var value = parseFloat(line.substr(vI + 1));
			
			data.push(new TransitionCA("00:00:00:000", null, c, "out", value));
		}.bind(this));
		
		return data;
	}
	
	ParsePalFile(file) {	
		var lines = file.trim().split(/\n/);
		
		if (lines[0].indexOf('[') != -1) return this.ParsePalTypeA(lines);
		
		else return this.ParsePalTypeB(lines);
	}	
		
	ParseLogChunk(parsed, chunk) {		
		var pattern = 'Mensaje Y /';
		var start = chunk.indexOf(pattern, 0);		
		
		while (start > -1) {	
			start = start + pattern.length;
		
			var end = chunk.indexOf('\n', start);
			
			if (end == -1) end = chunk.length + 1;
			
			var length = end - start;
			var split = chunk.substr(start, length).split("/");
			
			// Parse coordinates, state value & frame timestamp
			var tmp1 = split[1].trim().split("(");
			var tmp2 = split[3].trim().split(/\s|\(/g);
			
			// NOTE : Don't use regex, it's super slow.
			var t = split[0].trim();								// time
			var m = tmp1[0];										// model name
			var c = tmp1[1].slice(0, -1).split(",").map(d => +d);	// coordinate
			var p = split[2].trim();								// port
			var v = parseFloat(tmp2[0]);							// value
			
			parsed.push(new TransitionCA(t, m, c, p, v));
			
			var start = chunk.indexOf(pattern, start + length);
		};
		
		return parsed;
	}
	
	ParsePalTypeA(lines) {		
		// Type A: [rangeBegin;rangeEnd] R G B
		var scale = new Scale;
		
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
				paletteRanges.push([parseFloat(components[0]), parseFloat(components[1])]); 
			}
			else if (components.length == 3){ 
				// this line is a palette element [R,G,B]
				paletteColors.push([parseInt(.95 * parseInt(components[0],10)), 
									parseInt(.95 * parseInt(components[1],10)), 
									parseInt(.95 * parseInt(components[2],10))]); 
			}
		}

		// populate grid palette object
		for (var i = paletteRanges.length; i-- > 0;){
			scale.AddClass(paletteRanges[i][0], paletteRanges[i][1], paletteColors[i]);
		}
		
		return scale.ToJson();
	}
	
	MergeFrames(f1, f2) {
		var index = {};
		
		f1.forEach(t => index[t.coord.join(",")] = t);
		
		// f2 over f1, modifies f1, who cares.
		f2.forEach(function(t2) {
			var id = t2.coord.join(",");
			
			// frame 1 has transition id from frame 2, replace
			if (index[id])  {
				index[id].value = t2.value;
				index[id].diff = t2.diff;
			}
			
			// frame 1 doesn't have transition id from frame 2, add it
			else f1.push(t2);
		});
		
		return f1;
	}
	
	GlobalFrame(size, value) {
		var f = [];
		
		for (var x = 0; x < size[0]; x++) {
			for (var y = 0; y < size[1]; y++) {
				for (var z = 0; z < size[2]; z++) {					
					f.push(new TransitionCA("00:00:00:000", null, [x, y, z], "out", value));
				}
			}
		}
		
		return f;
	}
	
	RowsFrame(line) {		
		var d = line.split(/\s+/);
		var values = d[1].split('');
		var rows = [];
		
		for (var y = 0; y < values.length; y++) {
			rows.push(new TransitionCA("00:00:00:000", null, [d[0], y], "out", +values[y]));
		}
		
		return rows;
	}
}
