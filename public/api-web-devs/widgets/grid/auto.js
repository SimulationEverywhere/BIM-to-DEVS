'use strict';

import Core from '../../tools/core.js';
import Dom from '../../tools/dom.js';
import Tooltip from '../../ui/tooltip.js';
import Automator from '../../components/automator.js';

export default Core.Templatable("Auto.Grid", class AutoGrid extends Automator { 

	get Canvas() { return this.Widget.Canvas; }

	constructor(grid, simulation, options) {
		options = options || {};	// Default empty options if not provided

		super(grid, simulation);
		
		this.AttachHandlers(options);
		
		this.BuildTooltip();
		
		this.Widget.Dimensions = this.simulation.Dimensions;
		this.Widget.Columns = options.columns;
		this.Widget.Spacing	= options.spacing;
		this.Widget.Layers	= options.layers;
		this.Widget.Styler	= options.styler;
	}
	
	AttachHandlers(options) {
		var h = [];
		
		if (options.hoverEnabled != false) h.push(this.Widget.On("MouseMove", this.onMouseMove_Handler.bind(this)));
		if (options.hoverEnabled != false) h.push(this.Widget.On("MouseOut", this.onMouseOut_Handler.bind(this)));
		if (options.clickEnabled != false) h.push(this.Widget.On("Click", this.onClick_Handler.bind(this)));
		
		h.push(this.Simulation.On("Move", this.onSimulationMove_Handler.bind(this)));
		h.push(this.Simulation.On("Jump", this.onSimulationJump_Handler.bind(this)));
		
		h.push(options.styler.On("Change", this.onSimulationPaletteChanged_Handler.bind(this)));
		
		this.Handle(h);
	}
	
	BuildTooltip() {
		this.tooltip = new Tooltip();
		
		this.tooltip.nodes.label = Dom.Create("div", { className:"tooltip-label" }, this.tooltip.Elem("content"));
	}
	
	Redraw() {
		this.Widget.Resize();
		
		var s = this.Simulation;
		
		this.Widget.DrawState(s.state, s);
	}
	
	onSimulationMove_Handler(ev) {		
		var s = this.Simulation;
		
		this.Widget.DrawChanges(ev.frame, s);
	}
	
	onSimulationJump_Handler(ev) {
		var s = this.Simulation;
		
		this.Widget.DrawState(s.state, s);
	}
	
	onSimulationPaletteChanged_Handler(ev) {
		var s = this.Simulation;
		
		this.Widget.DrawState(s.state, s);
	}
	
	onMouseMove_Handler(ev) {
		var labels = [];
		
		ev.data.layer.ports.forEach(port => {
			var state = this.simulation.state.GetValue([ev.data.x, ev.data.y, ev.data.layer.z]);
			var subs = [ev.data.x, ev.data.y, ev.data.layer.z, state[port], port];
			
			labels.push(Core.Nls("Grid_Tooltip_Title", subs));
			
			this.tooltip.Show(ev.x + 20, ev.y);
		});
		
		this.tooltip.nodes.label.innerHTML = labels.join("<br>");
	}
	
	onMouseOut_Handler(ev) {
		this.tooltip.Hide();
	}
	
	onClick_Handler(ev) {
		var id = ev.data.x + "-" + ev.data.y + "-" + ev.data.z;
		var isSelected = this.Simulation.IsSelected(id);		
		
		if (!isSelected) {
			this.Simulation.Select(id);
			
			var color = this.Simulation.Palette.SelectedColor;
		} 
		
		else {
			this.Simulation.Deselect(id);

			var v = this.simulation.state.models[id];
			
			var color = this.Simulation.Palette.GetColor(v);
		}
		
		this.Widget.DrawCellBorder(ev.data.x, ev.data.y, ev.data.k, color);
	}
});