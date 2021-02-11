'use strict';

import Core from '../../tools/core.js';
import Dom from '../../tools/dom.js';
import Net from '../../tools/net.js';
import Templated from '../../components/templated.js';
import Select from '../../ui/select.js';

export default class SelectPorts extends Templated {
	
	set available(value) { this._available = value; }
	
	get available() { return this._available; }
	
	set value(value) { this._value = value; }
	
	get value() { return this._value; }
	
	get Opened() { return this.Elem("dropdown").children.length > 0; }
	
	constructor(id) {
		super(id);
		
		this.OnInput_Click_Bound = this.onInput_Click.bind(this);
		this.onBody_KeyUp_Bound = this.onBody_KeyUp.bind(this);
		this.onBody_Click_Bound = this.onBody_Click.bind(this);
		
		this.items = [];
		
		this._available = null;
		this._value = null;
		this._previous = null;
		
		this.Node("input").On("click", this.OnInput_Click_Bound);
	}
	
	Open() {		
		Dom.RemoveCss(this.Elem('top'), 'collapsed');
		
		document.body.addEventListener("keyup", this.onBody_KeyUp_Bound);
		document.body.addEventListener("click", this.onBody_Click_Bound);
		
		this._previous = this.value;
		this.value = [];
		
		this.available.forEach(a => {
			var li = Dom.Create("li", { className:'select-ports-dropdown-item', innerHTML:a }, this.Elem("dropdown"));
			
			li.addEventListener("click", this.onLi_Click.bind(this, a));
		});
	}
	
	Close() {		
		Dom.AddCss(this.Elem('top'), 'collapsed');
		
		document.body.removeEventListener("keyup", this.onBody_KeyUp_Bound);
		document.body.removeEventListener("click", this.onBody_Click_Bound);
		
		Dom.Empty(this.Elem("dropdown"));
		
		if (this.value.length == 0) this.Select(this._previous);
	}
	
	Select(ports) {
		this.value = ports;
		
		this.Elem('input').value = this.value.join(", ");
	}
	
	onInput_Click(ev) {
		if (this.Opened) this.Close();
		
		else this.Open();
	}
	
	onLi_Click(port, ev) {
		ev.stopPropagation();
		
		this.value.push(port);
		
		this.Select(this.value);
		
		this.Elem('dropdown').removeChild(ev.target);
		
		if (this.Elem('dropdown').children.length == 0) this.Close();
	}
	
	onBody_KeyUp(ev) {
		if (ev.keyCode == 27) this.Close();
	}
	
	onBody_Click(ev) {
		if (this.Elem("input") == ev.target) return;
			
		this.Close();
	}
	
	Template() {
		return "<div handle='top' class='select-ports collapsed'>" +
				   "<input handle='input' class='select-ports-input' type='text' readonly/>" +  
				   "<ul handle='dropdown' class='select-ports-dropdown'></ul>" +
			   "</div>";
	}
}