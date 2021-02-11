'use strict';

import Core from '../../tools/core.js';
import Dom from '../../tools/dom.js';
import Net from '../../tools/net.js';
import Templated from '../../components/templated.js';
import Select from '../../ui/select.js';
import Scale from '../../components/scales/basic.js';

export default Core.Templatable("Widget.Settings.Styles", class Styles extends Templated { 
	
	constructor(container) {
		super(container);
		
		this.items = null;
		this.tooltip = null;
		this.bIdx = null;
		
		this.BuildTooltip();
		
		this.Node('addClass').On("click", this.OnButtonAddClass_Click.bind(this));
		
		// Need to make Node access uniform (widget vs node vs element)
		this.Widget('addStyle').On("Change", this.OnSelectAddStyle_Change.bind(this));
		this.Node('addStyle').On("click", this.OnButtonAddStyle_Click.bind(this));
		this.Node('delStyle').On("click", this.OnButtonDelStyle_Click.bind(this));
	}
	
	BuildTooltip() {
		this.tooltip = Dom.Create("div", { className:"picker-container hidden" }, document.body);
		
		this.picker = new iro.ColorPicker(this.tooltip, {
			width : 170,
			layoutDirection : "vertical",
			sliderSize : 15
		});
		
		this.picker.base.children[0].tabIndex = 0;
		this.picker.base.children[1].tabIndex = 0;
		
		this.tooltip.addEventListener("mouseleave", (ev) => {
			Dom.AddCss(this.tooltip, "hidden");
			
			var c = this.picker.color.rgb;
			
			this.items[this.bIdx].color.style.backgroundColor = this.picker.color.rgbString;
			this.items[this.bIdx].data.color = [c.r, c.g, c.b];
			
			this.bIdx = null;
		});
	}
	
	Initialize(styler, style) {
		this.styler = styler;
		this.styles = styler.ToJson(); 
		
		this.LoadStylesDropdown(this.styles);		
		this.ShowStyle(style);
	}
	
	LoadStylesDropdown(styles) {
		this.Widget('addStyle').Empty();
		
		styles.forEach((s, i) => this.Widget('addStyle').Add(i, null, s));
	}
	
	ShowStyle(style) {
		this.Widget("addStyle").value = style;
		
		Dom.Empty(this.Elem("body"));
		
		this.items = [];
		
		this.styles[style].buckets.forEach(c => this.AddStyleClass(c));
	}
	
	AddStyleClass(c) {
		var item = {};
		
		item.data = c;
		item.row = Dom.Create("tr", { className:"table-row" }, this.Elem("body"));
		item.start = this.AddStart(item.row, c);
		item.end = this.AddEnd(item.row, c);
		item.color = this.AddColor(item.row, c, this.items.length);
		item.btnDelete = this.AddDeleteButton(item);
		
		item.start.addEventListener("change", ev => item.data.start = +ev.target.value);
		item.end.addEventListener("change", ev => item.data.end = +ev.target.value);
		
		this.items.push(item);
	}
	
	AddStart(tr, c) {
		var td = Dom.Create("td", { className:"styles-start"}, tr);
		
		return Dom.Create("input", { value:c.start, type:'number' }, td);
	}
	
	AddEnd(tr, c) {
		var td = Dom.Create("td", { className:"styles-end"}, tr);
		
		return Dom.Create("input", { value:c.end, type:'number' }, td);
	}
	
	AddColor(tr, c, i) {
		var td = Dom.Create("td", { className:"styles-color"}, tr);
		var btn = Dom.Create("button", { className:"color" }, td);

		btn.style.backgroundColor = `rgb(${c.color})`;

		btn.addEventListener("click", (ev) => {
			this.bIdx = i;
			
			var geom = ev.target.getBoundingClientRect();
			
			this.tooltip.style.left = (geom.left - window.scrollX) + "px";
			this.tooltip.style.top = (geom.top - window.scrollY) + "px";
			
			Dom.RemoveCss(this.tooltip, "hidden");
		});

		return btn;
	}
	
	AddDeleteButton(item) {
		var td = Dom.Create("td", { className:"grid-delete"}, item.row);
		var btn = Dom.Create("button", { className:"table-button button-delete image-button" }, td);
		var img = Dom.Create("img", { className:"image-icon", src:"./assets/delete.png", title:Core.Nls("Settings_Class_Delete_Title") }, btn);
		
		btn.addEventListener('click', this.OnButtonDelete_Click.bind(this, item));
		
		return btn;
	}
	
	OnButtonAddClass_Click(ev) {	
		var i = this.Widget('addStyle').value;
		var c = { start:0, end:0, color:[255, 255, 255] };
		
		this.styles[i].buckets.push(c);
	
		this.AddStyleClass(c);
		
		this.Elem("classes").scrollTop = this.Elem("classes").scrollHeight;
	}	
	
	OnSelectAddStyle_Change(ev) {		
		this.ShowStyle(ev.target.value);
	}	
	
	OnButtonAddStyle_Click(ev) {
		this.styles.push([]);
		
		this.LoadStylesDropdown(this.styles);
		
		this.ShowStyle(this.styles.length - 1);
		
		this.Emit("stylesChanged", { styles:this.styles.length });
	}
	
	OnButtonDelStyle_Click(ev) {		
		this.styles.splice(this.Widget("addStyle").selectedIndex, 1);
				
		this.LoadStylesDropdown(this.styles);
		
		this.ShowStyle(0);
		
		this.Emit("stylesChanged", { styles:this.styles.length });
	}
	
	OnButtonDelete_Click(item, ev) {		
		var i = this.Widget('addStyle').value;
		var j = this.items.indexOf(item);
		
		this.styles[i].buckets.splice(j, 1);
		this.items.splice(j, 1);
		
		Dom.Remove(item.row, this.Elem("body"));
	}
	
	Template() {
		return	 "<div class='settings-title-container'>" +
				    "<h3 class='settings-group-label Cell-DEVS'>nls(Settings_Styles)</h3>" +
				    "<div handle='addStyle' class='style-add' widget='Basic.Components.Select'></div>" +
					"<button handle='addStyle' class='table-button image-button' title='nls(Settings_Layers_Add_Style_Title)'>" + 
					   "<img src='./assets/add.png' class='image-icon'/>" +
					"</button>" +		
					"<button handle='delStyle' class='table-button image-button' title='nls(Settings_Layers_Del_Style_Title)'>" + 
					   "<img src='./assets/delete.png' class='image-icon'/>" +
					"</button>" +		
				 "</div>" + 
				 "<div handle='classes' class='style'>" + 
					"<table>" + 
						"<thead>" +
							"<tr>" + 
								"<td class='col-1'>nls(Settings_Style_Start)</td>" +
								"<td class='col-2'>nls(Settings_Style_End)</td>" +
								"<td class='col-3'>nls(Settings_Style_Color)</td>" +
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
									"<button handle='addClass' class='table-button image-button' title='nls(Settings_Class_Add_Title)'>" + 
										"<img src='./assets/add.png' class='image-icon'/>" +
									"</button>" +
								"</td>" +
							"</tr>" +
						"</tfoot>" + 
					"</table>" + 
				 "</div>";
	}
})