'use strict';

import Core from '../tools/core.js';
import Dom from '../tools/dom.js';

import Templated from '../components/templated.js';

export default Core.Templatable("Basic.Components.Select", class Select extends Templated {
	
	get value() {
		return this.Elem("root").value;
	}
	
	set value(value) {
		this.Elem("root").value = value;
	}
	
	set disabled(value) {
		this.Elem("root").disabled = value;
	}
	
	get disabled() {
		return this.Elem("root").disabled;
	}
	
	get selected() {		
		return this.items[this.selectedIndex];
	}
	
	get selectedIndex() {
		return this.Elem("root").value;
	}
	
	set placeholder(value) {
		this.ph = Dom.Create("option", { innerHTML:value, value:-1, className:"select-placeholder" });
		
		this.ph.disabled = true;
		this.ph.selected = true;
		
		this.Elem("root").insertBefore(this.ph, this.Elem("root").firstChild);
	}
	
	get length() {
		return this.items.length;
	}
	
	constructor(container, options) {
		super(container, options);
		
		this.items = [];
		
		this.ph = null;
		
		this.Node("root").On("change", this.OnSelect_Change.bind(this));
	}
	
	Add(label, title, item) {
		Dom.Create("option", { innerHTML:label, value:this.items.length, title:title }, this.Elem("root"));
		
		this.items.push(item);
	}
	
	Select(delegate) {		
		this.value = this.FindIndex(delegate);
	}
	
	FindIndex(delegate) {
		for (var i = 0; i < this.items.length; i++) {
			if (delegate(this.items[i], i)) return i;
		}
		
		return -1;
	}
	
	OnSelect_Change(ev) {
		var item = this.items[ev.target.value];
		
		this.Emit("Change", { index:ev.target.value, item:item, label:ev.target.innerHTML });
	}
	
	Template() {
		return '<select handle="root"></select>';
	}
	
	Empty() {
		Dom.Empty(this.Elem("root"));
		
		this.items = [];
		
		if (!this.ph) return;
		
		Dom.Place(this.ph, this.Elem("root"));
	
		this.ph.selected = true;
	}
});