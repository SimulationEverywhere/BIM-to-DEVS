'use strict';

import Core from '../../tools/core.js';
import Evented from '../../components/evented.js';

const SELECTED_COLOR = "red";

export default class Scale extends Evented { 
	
	get SelectedColor() { return SELECTED_COLOR; }

	constructor(classes) {
		super();
		
		this.classes = [];
		
		if (classes) this.AddClasses(classes);
	}
	
	AddClasses(classes) {
		classes.forEach(p => this.AddClass(p.start, p.end, p.color));
	}
	
	AddClass(start, end, color) {
		var clss = { i:this.classes.length, start:start, end:end, color:color };
		
		this.classes.push(clss);
		
		return clss;
	}
	
	RemoveClass(clss) {
		var i = this.classes.indexOf(clss);
		
		this.classes.splice(i, 1);
		
		this.Emit("Change", { scale:this });
	}
	
	GetColor(value) {
		var color = this.GetColor3(value);

		return `rgb(${color.join(",")})`;
	}
	
	GetColor3(value) {
		for (var i = 0; i < this.classes.length; i++) {
			var c = this.classes[i];
			
			if (value >= c.start && value < c.end) return c.color;
		}
		
		return [0,0,0];
	}
	
	SetColor(clss, color) {
		clss.color = color;
		
		this.Emit("Change", { scale:this });
	}
	
	SetStart(clss, value) {
		clss.start = value;
		
		this.Emit("Change", { scale:this });
	}
	
	SetEnd(clss, value) {
		clss.end = value;
		
		this.Emit("Change", { scale:this });
	}
	
	Save() {
		return {
			fileName : this.fileName,
			classes : this.classes
		}
	}
	
	Load(config) {
		this.fileName = config.fileName;
		this.classes = config.classes;
		
		this.Emit("Session", { scale:this });
	}
	
	Buckets(n, cMin, cMax, vMin, vMax) {
		var c1 = Core.HexToRgb(cMin);
		var c2 = Core.HexToRgb(cMax);
		
		var d = (vMax - vMin) / n;
		
		var dR = (c2[0] - c1[0]) / (n - 1);
		var dG = (c2[1] - c1[1]) / (n - 1);
		var dB = (c2[2] - c1[2]) / (n - 1);
		
		this.classes = [];
		
		for (var i = 0; i < n; i++) {
			var v1 = vMin + i * d;
			var v2 = vMin + (i + 1) * d;
			
			var r = c1[0] + dR * i;
			var g = c1[1] + dG * i;
			var b = c1[2] + dB * i;
			
			this.classes.push({ i:classes.length, start:v1, end:v2, color:[r,g,b] });
		}
	
		this.Emit("Change", { scale:this });
	}
	
	ToJson() {
		return this.classes.map(c => {
			return {
				start : c.start,
				end : c.end,
				color : c.color
			}
		});
	}
}