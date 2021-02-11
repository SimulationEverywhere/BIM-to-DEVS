'use strict';

import Core from '../tools/core.js';
import Dom from '../tools/dom.js';
import Evented from './evented.js';
import Node from './node.js';

export default class Templated extends Evented { 

	constructor(container, options) {
		super();
		
		this.options = options || { };
		
		this.BuildTemplate();
		
		if (this.template) this.SetNamedNodes();
	
		// TODO: Reorganize this so that the template has been added to the DOM before building subwidgets
		if (this.template) this.BuildSubWidgets();
		
		this.SetRoots();
		
		// TODO: Here, template is placed in DOM, this must happen before building subwidgets
		if (container) this.Place(container);
	}
	
	BuildTemplate() {
		// Use template provided in options first, use Template function second
		var html = this.options.template ? this.options.template : this.Template();
		
		// TODO : I think it still works with empty templates.
		if (!html) return;
		
		// Trailing whitespaces can cause issues when parsing the template, remove them
		html = html.trim();
		
		// Replace all nls strings in template. Nls string pattern in templates is nls(StringId)
		html = this.Replace(html, /nls\((.*?)\)/, function(m) { return Core.Nls(m); });
		
		this.template = Dom.Create("div", { innerHTML:html });
	}
	
	SetRoots() {
		this.roots = [];
		
		for (var i = 0; i < this.template.children.length; i++) {
			this.roots.push(this.template.children[i]);
		}
	}
	
	SetNamedNodes() {		
		var named = this.template.querySelectorAll("[handle]");
		
		this.nodes = {};
		this.widgets = {};
		
		// Can't use Array ForEach here since named is a NodeList, not an array
		for (var i = 0; i < named.length; i++) { 
			var name = Dom.GetAttribute(named[i], "handle");
			
			this.nodes[name] = named[i];
		}
	}
	
	AddWidget(id, widget) {
		if (this.widgets[id]) throw new Error(`Widget with id ${id} already defined.`);
		
		this.widgets[id] = widget;
	}
	
	BuildSubWidgets() {		
		var nodes = this.template.querySelectorAll("[widget]");
		
		// Can't use Array ForEach here since nodes is a NodeList, not an array
		for (var i = 0; i < nodes.length; i++) {
			var path = Dom.GetAttribute(nodes[i], "widget");
			var module = Core.Templatable(path);
			var widget = new module(nodes[i]);
			var handle = Dom.GetAttribute(widget.container, "handle");
			
			if (handle) this.widgets[handle] = widget;
		}
	}
	
	Place(container) {
		this.container = container;
		
		this.roots.forEach(r => { Dom.Place(r, this.container); });
	}
	
	SetCss(css) {
		this.roots.forEach(r => { Dom.SetCss(r, css); });
	}
	
	Template() {
		return null;		
	}

	Replace(str, expr, delegate) {
		var m = str.match(expr);
		
		while (m) {
			str = str.replace(m[0], delegate(m[1]));
			m = str.match(expr);
		}
		
		return str;
	}
	
	Node(id) {
		return new Node(this.nodes[id]);
	}
	
	Elem(id) {
		return this.nodes[id];
	}
	
	Widget(id) {
		return this.widgets[id];
	}
	// TODO : Build a root function
}