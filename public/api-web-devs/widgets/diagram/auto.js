'use strict';

import Core from '../../tools/core.js';
import Dom from '../../tools/dom.js';
import Tooltip from '../../ui/tooltip.js';
import Automator from '../../components/automator.js';

export default Core.Templatable("Auto.Diagram", class AutoDiagram extends Automator { 

	constructor(diagram, simulation, options) {
		options = options || {};	// Default empty options if not provided
		
		super(diagram, simulation);
		
		this.Widget.SetDiagram(this.Simulation);
		
		this.Widget.Draw(this.Simulation.CurrentFrame.OutputMessages);
		
		this.selected = [];

		this.AttachHandlers(options);
		
		this.UpdateSelected();

		this.tooltip = new Tooltip();
	}
	
	AttachHandlers(options) {
		var h = [];

		if (options.hoverEnabled != false) h.push(this.Widget.On("MouseMove", this.onMouseMove_Handler.bind(this)));
		if (options.hoverEnabled != false) h.push(this.Widget.On("MouseOut", this.onMouseOut_Handler.bind(this)));
		if (options.clickEnabled != false) h.push(this.Widget.On("Click", this.onClick_Handler.bind(this)));
		
		h.push(this.Simulation.On("Move", this.onSimulationChange_Handler.bind(this)));
		h.push(this.Simulation.On("Jump", this.onSimulationChange_Handler.bind(this)));
		h.push(this.Simulation.On("Selected", this.onSimulationChange_Handler.bind(this)));
		
		this.Handle(h);
	}
	
	UpdateSelected() {
		this.selected = this.Simulation.Selected;
	}
	
	Redraw() {
		this.Widget.Resize();
	}
		
	onSimulationChange_Handler(ev) {		
		var messages = this.simulation.CurrentFrame.OutputMessages;
		
		this.Widget.Draw(messages);
	}
	
	onMouseMove_Handler(ev) {
		var messages = this.Simulation.CurrentFrame.OutputMessages;
		
		Dom.Empty(this.tooltip.Elem("content"));
		
		var tY = messages.filter(t => t.Emitter.Model.Name == ev.model.Name);
		
		if (tY.length == 0) return;
		
		tY.forEach(t => {
			var subs = [t.Emitter.Model.Name, t.Value.value, t.Emitter.Name];
			var html = Core.Nls("Diagram_Tooltip_Y", subs);
			
			Dom.Create("div", { className:"tooltip-label", innerHTML:html }, this.tooltip.Elem("content"));
		});
		
		this.tooltip.Show(ev.x + 20, ev.y);
	}
	
	onClick_Handler(ev) {
		var idx = this.selected.indexOf(ev.model);

		// TODO : Selection should be handled by diagram, not auto class
		if (idx == -1) {
			this.selected.push(ev.model);
			
			this.Widget.AddModelCss(ev.svg, ["selected"]);
		}
		else {
			this.selected.splice(idx, 1);
			
			this.Widget.RemoveModelCss(ev.svg, ["selected"]);
		}
	}

	onMouseOut_Handler(ev) {
		this.tooltip.Hide();
	}
});