'use strict';

import Core from '../../tools/core.js';
import Dom from '../../tools/dom.js';
import Net from '../../tools/net.js';
import Templated from '../../components/templated.js';
import Select from '../../ui/select.js';
import Ports from './ports.js';
import Styles from './styles.js';

export default Core.Templatable("Widget.Settings.Layers", class Layers extends Templated { 
	
	set Layers(value) { this.layers = value; }
	
	get Layers() { return this.layers; }
	
	constructor(id) {
		super(id);
		
		this.items = null;
		
		this.Node('add').On("click", this.OnButtonAdd_Click.bind(this));
		this.Node('btnCancel').On("click", this.OnButtonCancel_Click.bind(this));
		this.Node('btnApply').On("click", this.OnButtonApply_Click.bind(this));
		
		this.Widget("styles").On("stylesChanged", this.OnStyles_NewStyle.bind(this));
	}
	
	Initialize(simulation, settings) {
		this.items = [];
		Dom.Empty(this.Elem("body"));
		
		this.simulation = simulation;
		this.layers = settings.layers;
		this.styler = settings.styler;
		
		this.layers.forEach((l) => { this.AddLayer(l.z, l.ports, l.style); });
		
		this.ShowStyle(0);
	}
	
	AddLayer(z, ports, style) {
		var item = {}
				
		item.data = { z:z, ports:ports, style:style };
		item.row = Dom.Create("tr", { className:"table-row" }, this.Elem("body"));		
		item.z = this.AddZ(item.row, this.simulation.MaxZ, z);
		item.ports = this.AddPorts(item.row, this.simulation.Ports, ports);
		item.style = this.AddStyle(item.row, this.styler, style);
		item.btnDelete = this.AddDeleteButton(item);
		
		this.items.push(item);
	}
	
	AddDeleteButton(item) {
		var td = Dom.Create("td", { className:"grid-delete"}, item.row);
		var btn = Dom.Create("button", { className:"table-button button-delete image-button" }, td);
		var img = Dom.Create("img", { className:"image-icon", src:"./assets/delete.png", title:Core.Nls("Settings_Layers_Delete_Title") }, btn);
		
		btn.addEventListener('click', this.OnButtonDelete_Click.bind(this, item));
		
		return btn;
	}
	
	AddStyleButton(item) {
		var td = Dom.Create("td", { className:"grid-style"}, item.row);
		var btn = Dom.Create("button", { className:"table-button button-style image-button" }, td);
		var img = Dom.Create("img", { className:"image-icon", src:"./assets/color-wheel-flat.png", title:Core.Nls("Settings_Layers_Style_Title") }, btn);
		
		btn.addEventListener('click', this.OnButtonStyle_Click.bind(this, item));
		
		return btn;
	}
	
	AddStyle(tr, styler, selected) {
		var td = Dom.Create("td", { className:"grid-styles"}, tr);
		
		var select = new Select(td);

		styler.scales.forEach((s, i) => select.Add(i, null, s));
		
		select.Select((item, i) => i == selected);
		
		return select;
	}
	
	AddPorts(tr, ports, selected) {
		var td = Dom.Create("td", { className:"grid-ports"}, tr);
		
		var select = new Ports(td);
		
		select.available = ports;
				
		select.Select(selected);
		
		return select;
	}
	
	AddZ(tr, max, selected) {
		var td = Dom.Create("td", { className:"grid-z"}, tr);
		
		var select = new Select(td);
		
		for (var i = 0; i < max; i++) select.Add(i, null, i);
		
		select.Select(i => i == selected);
		
		return select;
	}
	
	ShowStyle(style) {				
		this.Widget("styles").Initialize(this.styler, style);
	}
	
	OnButtonStyle_Click(item, ev) {
		this.ShowStyle(item.data.i, item.data.style);
	}
	
	OnButtonAdd_Click(ev) {
		this.AddLayer(0, this.simulation.Ports, 0);
		
		this.Elem("layers").scrollTop = this.Elem("layers").scrollHeight;
	}
	
	OnButtonCancel_Click(ev) {
		this.Emit("close", {});
	}
	
	OnButtonApply_Click(ev) {
		var layers = this.items.map((item, i) => {
			return {
				z : item.z.value,
				ports : item.ports.value,
				style : item.style.value,
				position : i
			}
		});
		
		var styles = this.Widget("styles").styles;
		
		this.Emit("apply", { layers:layers, styles:styles});
	}
	
	OnButtonDelete_Click(item, ev) {		
		var i = this.items.indexOf(item);
		
		this.items.splice(i, 1);
		
		Dom.Remove(item.row, this.Elem("body"));
		
		this.items.forEach((item, i) => item.data.i = i + 1);
	}		
	
	OnStyles_NewStyle(ev) {
		this.items.forEach(item => {
			var original = item.style.value;
			
			item.style.Empty();
			
			for (var i = 0; i < ev.styles; i++) item.style.Add(i, null, i);
			
			item.style.value = original >= item.style.length ? 0 : original;
		});
	}
	
	Template() {
		return	 "<div class='settings-title-container'>" +
				    "<h3 class='settings-group-label Cell-DEVS'>nls(Settings_Layers)</h3>"+ 
				 "</div>" + 
			     "<div handle='layers' class='layers'>" + 
					"<table>" + 
						"<thead>" +
							"<tr>" + 
								"<td class='col-1'>nls(Settings_Layers_Z)</td>" +
								"<td class='col-2'>nls(Settings_Layers_Ports)</td>" +
								"<td class='col-3'>nls(Settings_Layers_Styles)</td>" +
								"<td class='col-4'></td>" +
							"</tr>" +
						"</thead>" + 
						"<tbody handle='body'></tbody>" + 
						"<tfoot handle='foot'>" + 
							"<tr>" + 
								"<td class='col-1'></td>" +
								"<td class='col-2'></td>" +
								"<td class='col-3'></td>" +
								"<td class='col-4'>" + 
									"<button handle='add' class='table-button image-button' title='nls(Settings_Layers_Add_Title)'>" + 
									   "<img src='./assets/add.png' class='image-icon'/>" +
									"</button>" +								
								"</td>" +
							"</tr>" +
						"</tfoot>" + 
				 	"</table>" + 
			     "</div>" +
			     "<div handle='styles' class='styles' widget='Widget.Settings.Styles'></div>" +
				 "<div class='buttons-container'>" +
				    "<button handle='btnCancel' class='settings-button'>nls(Settings_Layers_Cancel)" +
					   "<i class='fas fa-ban'></i>" + 
				    "</button>" +
				    "<button handle='btnApply' class='settings-button'>nls(Settings_Layers_Apply)" +
					   "<i class='fas fa-check'></i>" + 
				    "</button>" +
				 "</div>";
	}
});