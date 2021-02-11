'use strict';

import Core from '../tools/core.js';
import Dom from '../tools/dom.js';

export default class Node { 

	get Element() { return this.elem; }

	constructor(elem) {
		this.elem = elem;
	}
	
	On(type, handler) {
		this.elem.addEventListener(type, handler);
	}
	
	Off(type, handler) {
		this.elem.removeEventListener(type, handler);
	}
	
	Elem(selector) {
		var elem = this.elem.querySelector(selector);
		
		return (!elem) ? null : elem;
	}
	
	Elems(selector) {
		var elems = this.elem.querySelectorAll(selector);
		var out = [];
		
		elems.forEach(e => out.push(e));
		
		return out;
	}
	
	Node(selector) {
		var elem = this.elem.querySelector(selector);
		
		return (!elem) ? null : new Node(elem);
	}
	
	Nodes(selector) {
		var elems = this.elem.querySelectorAll(selector);
		var out = [];
		
		elems.forEach(e => out.push(new Node(e)));
		
		return out;
	}
}