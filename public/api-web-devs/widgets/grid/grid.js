'use strict';

import Core from '../../tools/core.js';
import Dom from '../../tools/dom.js';
import Templated from '../../components/templated.js';

const STROKE_WIDTH = 2;
const DEFAULT_COLOR = "#fff";

export default Core.Templatable("Widgets.Grid", class Grid extends Templated { 

	get Canvas() { return this.Elem("canvas"); }
	
	set Dimensions(value) { this.dimensions = value; }
	
	set Columns(value) { this.columns = value; }
	
	set Spacing(value) { this.spacing = value; }
	
	set Layers(value) { 
		this.layers = value; 
		this.index = {};
		
		this.layers.forEach((l, i) => {			
			if (!this.index.hasOwnProperty(l.z)) this.index[l.z] = {};
				
			l.ports.forEach(p => {
				if (!this.index[l.z].hasOwnProperty(p)) this.index[l.z][p] = [];
				
				
				this.index[l.z][p].push(l);
			});
		});
	}
	
	set Styler(value) { this.styler = value; }

	constructor(node) {
		super(node);

		this.cell = { w:null, h:null };
		this.dimensions = null;
		this.columns = null;
		this.spacing = null;
		this.size = null;
		this.styler = null;
		
		this.layers = [];
		this.grids = [];

		this.ctx = this.Elem("canvas").getContext("2d");
		
		this.Node("canvas").On("mousemove", this.onCanvasMouseMove_Handler.bind(this));
		this.Node("canvas").On("mouseout", this.onCanvasMouseOut_Handler.bind(this));
		this.Node("canvas").On("click", this.onCanvasClick_Handler.bind(this));
	}
	
	Template() {
		return "<div class='grid'>" + 
				  "<div handle='canvas-container' class='grid-canvas-container'>" +
					"<canvas handle='canvas' class='grid-canvas'></canvas>" +
				  "</div>" + 
			   "</div>";
	}
	/*
	AddLayer(z, port) {
		this.layers.push({ z:z, port:port });
	}
	*/
	GetRows(columns, layers) {
		return Math.ceil(layers.length / columns) ;
	}
	
	Resize() {
		this.size = Dom.Geometry(this.Elem("canvas-container"));
		
		// Number of columns and rows
		this.layout = {
			columns : this.columns,
			rows : this.GetRows(this.columns, this.layers)
		}

		// Size of one layer drawn, only used to determine cell size, shouldn't be used after
		var layer = {
			w : (this.size.w - (this.layout.columns * this.spacing - this.spacing)) / this.layout.columns,
			h : (this.size.h - (this.layout.rows * this.spacing - this.spacing)) / this.layout.rows
		}
		
		// Size of a cell
		this.cell = {
			w : Math.floor(layer.w / this.dimensions.x),
			h : Math.floor(layer.h / this.dimensions.y)
		}
		
		// Total effective size of drawing space 
		this.total = {
			w : (this.cell.w * this.dimensions.x) * this.layout.columns + this.layout.columns * this.spacing - this.spacing,
			h : (this.cell.h * this.dimensions.y) * this.layout.rows + this.layout.rows * this.spacing - this.spacing
		}

		// Determine offset w, h to center grid as much as possible
		this.margin = {
			w : (this.size.w - this.total.w) / 2,
			h : (this.size.h - this.total.h) / 2
		}
		
		this.grids = this.layers.map((l, i) => {	
			var row = Math.floor(i / this.layout.columns);
			var col = i - (row * this.layout.columns);

			var x1 = col * (this.dimensions.x * this.cell.w + this.spacing);
			var y1 = row * (this.dimensions.y * this.cell.h + this.spacing);
			var x2 = x1 + this.cell.w * this.dimensions.x;
			var y2 = y1 + this.cell.h * this.dimensions.y;

			return { x1:x1, y1:y1, x2:x2, y2:y2, z:l.z } 
		}) 
		
		this.Elem("canvas").style.margin = `${this.margin.h}px ${this.margin.w}px`;		
		
		// Redefine with and height to fit with number of cells and cell size
		this.Elem("canvas").width = this.total.w;	
		this.Elem("canvas").height = this.total.h;	
	}
	
	// TODO : grid shouldn't use simulation object maybe?
	Draw(state, simulation) {
		if (this.dimensions) this.DrawState(state, simulation);
		
		else this.Default(DEFAULT_COLOR);
	}
	
	Clear() {
		this.ctx.clearRect(0, 0, this.size.w, this.size.h);
	}
	
	Default(color) {
		this.ctx.fillStyle = color;
		this.ctx.fillRect(0, 0, this.size.w, this.size.h);
	}
	
	// TODO : grid shouldn't use simulation object maybe?
	DrawState(state, simulation) {
		for (var i = 0; i < this.layers.length; i++) {
			var l = this.layers[i];
			var scale = this.styler.GetScale(l.style);
			
			for (var x = 0; x < this.dimensions.x; x++) {
				for (var y = 0; y < this.dimensions.y; y++) {
					for (var p = 0; p < l.ports.length; p++) {
						var v = state.GetValue([x, y, l.z]); // value of cell to draw
						var f = l.ports[p]; 
						
						var color = scale.GetColor(v[f]) || 'rgb(200, 200, 200)';
						
						this.DrawCell(x, y, i, color);
					}
					
					var id = x + "-" + y + "-" + l.z; // id of cell to draw
					
					if (simulation.IsSelected(id)) this.DrawCellBorder(x, y, i, scale.SelectedColor);
				}
			}
		}
	}
	
	// TODO : grid shouldn't use simulation object maybe?
	DrawChanges(frame, simulation) {
		for (var i = 0; i < frame.StateMessages.length; i++) {
			var m = frame.StateMessages[i];
			
			for (var f in m.Value) {
				var layers = this.index[m.Z] && this.index[m.Z][f] || [];
				var v = m.Value[f];
				
				for (var j = 0; j < layers.length; j++) {
					var l = layers[j];
					var scale = this.styler.GetScale(l.style);
			
					this.DrawCell(m.X, m.Y, l.position, scale.GetColor(v));
					
					if (simulation.IsSelected(m.Emitter)) this.DrawCellBorder(m.X, m.Y, i, scale.SelectedColor);
				}
			}
		}
	}
	
	GetCell(clientX, clientY) {
		var rect = this.Elem("canvas").getBoundingClientRect();
		
		var x = clientX - rect.left;
		var y = clientY - rect.top;
		
		var zero = null;
		
		for (var k = 0; k < this.grids.length; k++) {
			if (x < this.grids[k].x1 || x > this.grids[k].x2) continue;
			
			if (y < this.grids[k].y1 || y > this.grids[k].y2) continue;
			
			zero = this.grids[k];
			
			break;
		}
		
		if (!zero || zero.y2 == y) return null;
		
		x = x - zero.x1;
		y = y - zero.y1;
		
		// Find the new X, Y coordinates of the clicked cell
		var pX = x - x % this.cell.w;
		var pY = y - y % this.cell.h;
		
		return { x:pX / this.cell.w, y:pY / this.cell.h, z:zero.z, k:k, layer:this.layers[k] };
	}
	
	DrawCell(x, y, k, color) {			
		var zero = this.grids[k];
			
		var x = zero.x1 + x * this.cell.w;
		var y = zero.y1 + y * this.cell.h;
		
		this.ctx.fillStyle = color;
		this.ctx.fillRect(x, y, this.cell.w, this.cell.h);
	}
	
	DrawCellBorder(x, y, k, color) {	
		var zero = this.grids[k];
		
		// Find the new X, Y coordinates of the clicked cell
		var pX = zero.x1 + x * this.cell.w;
		var pY = zero.y1 + y * this.cell.h;
		
		var dX = pX + (STROKE_WIDTH / 2);
		var dY = pY + (STROKE_WIDTH / 2);
				
		// Define a stroke style and width
		this.ctx.lineWidth = STROKE_WIDTH;
		this.ctx.strokeStyle = color;
		
		// Draw rectangle, add offset to fix anti-aliasing issue. Subtract from height and width 
		// to draw border internal to the cell
		this.ctx.strokeRect(dX, dY, this.cell.w - STROKE_WIDTH, this.cell.h - STROKE_WIDTH);
	}
	
	onCanvasClick_Handler(ev) {		
		var data = this.GetCell(ev.clientX, ev.clientY);
		
		if (!data) return;
		
		this.Emit("Click", { x:ev.pageX, y:ev.pageY, data:data });
	}
	
	onCanvasMouseMove_Handler(ev) {				
		var data = this.GetCell(ev.clientX, ev.clientY);
		
		if (!data) return;
		
		this.Emit("MouseMove", { x:ev.pageX, y:ev.pageY, data:data });
	}
		
	onCanvasMouseOut_Handler(ev) {		
		this.Emit("MouseOut", { x:ev.pageX, y:ev.pageY });
	}
});