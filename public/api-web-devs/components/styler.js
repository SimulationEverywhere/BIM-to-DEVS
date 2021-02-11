'use strict';

import Core from '../tools/core.js';
import Evented from '../components/evented.js';
import Scale from './scales/basic.js';

export default class Styler extends Evented { 
	
	get Empty() { return this.scales.length == 0 };
	
	constructor(scales) {
		super();
		
		this.scales = scales || [];
	}
	
	ToJson() {
		return this.scales.map(s => s.ToJson());
	}
	
	AddScale(scale) {
		this.scales.push(scale);
	}
	
	GetScale(idx) {
		var scale = this.scales[idx];
		
		if (!scale) throw new Error(`Style #${idx} does not exist.`);
		
		return scale;
	}
	
	GetColor(idx, value) {				
		return this.GetScale(idx).GetColor(value);
	}
	
	GetColor3(idx, value) {
		return this.GetScale(idx).GetColor3(value);
	}
	
	static FromJson(json) {
		var styler = new Styler();		
		
		json.forEach(layer => {
			var scale = new Scale(layer.buckets);
			
			styler.AddScale(scale);
		});
		
		return styler;
	}
	
	static Default() {
		var bucket = { start:-Infinity, end:Infinity, color:[0,0,0] };
		var scale = new Scale([bucket]);
		
		return new Styler([scale]);	
	}
	
	ToJson() {
		return this.scales.map(s => { 
			return { buckets:s.ToJson() } 
		});
	}
}