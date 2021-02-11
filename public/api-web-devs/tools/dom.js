'use strict';

import Core from './core.js';

export default class Dom {
	
	/**
	* Retrieve an Element using a selector
	*
	* Parameters :
	*	pNode : Element, the parent node where to begin the search
	*	selector : String, a selector statement
	* Return : Element, the Element found, null otherwise
	*/
	static Node(pNode, selector) {
		return pNode.querySelectorAll(selector).item(0) || null;
	}
	
	/**
	* Retrieve elements using a selector
	*
	* Parameters :
	*	pNode : Element, the parent node where to begin the search
	*	selector : String, a selector statement
	* Return : Element, the Element found, null otherwise
	*/
	static Nodes(pNode, selector) {
		return pNode.querySelectorAll(selector) || null;
	}

	/**
	* Create an Element
	*
	* Parameters :
	*	tagName : String, the type of Element to be created (div, span, label, input, etc.)
	*	options : Object, a dictionary type object containing the options to assign to the created Element
	*	pNode : Element, the parent Element where the created Element will be apended
	* Return : Element, The Element created
	*/
	static Create(tagName, options, pNode) {
		var elem = document.createElement(tagName);
		
		Core.Mixin(elem, options);
		
		this.Place(elem, pNode);
		
		return elem
	}

	/**
	* Create an SVG Element
	*
	* Parameters :
	*	tagName : String, the type of SVG Element to be created (rect, path, etc.)
	*	options : Object, a dictionary type object containing the options to assign to the created SVG Element
	*	pNode : Element, the parent Element where the created SVG Element will be apended
	* Return : Element, The SVG Element created
	*/
	static CreateSVG(tagName, options, pNode) {
		var elem = document.createElementNS("http://www.w3.org/2000/svg", tagName);
		
		for (var id in options) elem.setAttribute(id, options[id]);
		
		this.Place(elem, pNode);
		
		return elem;
	}

	/**
	* Create an Element from a namespace
	*
	* Parameters :
	*	ns : String, the URI namespace containing the Element to create 
	*	tagName : String, the type of Element to be created (rect, path, etc.)
	*	options : Object, a dictionary type object containing the options to assign to the created Element
	*	pNode : Element, the parent Element where the created Element will be apended
	*
	* Valid Namespaces are : 
	*	HTML : http://www.w3.org/1999/xhtml
	*	SVG  : http://www.w3.org/2000/svg
	*	XBL  : http://www.mozilla.org/xbl
	*	XUL  : http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul
	*
	* Return : Element, The SVG Element created
	*/
	static CreateNS(ns, tagName, options, pNode) {
		var elem = document.createElementNS(ns, tagName);
		
		for (var id in options) elem.setAttribute(id, options[id]);
		
		this.Place(elem, pNode);
		
		return elem;
	}

	/**
	* Append an Element to another Element
	*
	* Parameters :
	*	elem : Element, the Element to append
	*	pNode : Element, the parent Element where the Element will be apended
	* Return : none
	*/
	static Place(elem, pNode) {
		if (!!pNode) pNode.appendChild(elem);
	}

	/**
	* Replace an Element by another Element
	*
	* Parameters :
	*	elem1 : Element, the Element to be replaced
	*	elem2 : Element, the Element that will replace elem1
	* Return : none
	*/
	static Replace(elem1, elem2) {
		var pNode = elem1.parentNode;
		
		pNode.insertBefore(elem2, elem1);

		this.Remove(elem1, pNode);
	}

	/**
	* Remove an Element from another Element
	*
	* Parameters :
	*	elem : Element, the Element to remove
	* Return : none
	*/
	static Remove(elem) {
		elem.parentElement.removeChild(elem);
		
		// if (!pNode.children.some(function(child) { return (child === elem); })) return;
		
		// pNode.removeChild(elem);
	}

	/**
	* Remove all children of an Element
	*
	* Parameters :
	*	elem : Element, the Element to empty
	* Return : none
	*/
	static Empty(elem) {
		while (elem.firstChild) {
			elem.removeChild(elem.firstChild);
		}
	}

	/**
	* Add a CSS rule on an Element
	*
	* Parameters :
	*	elem : Element, the Element to modify
	*	css : String, the CSS rule to add on the Element
	* Return : none
	*/
	static AddCss(elem, css) {
		var c1 = elem.className.split(" ");
		
		css.split(" ").forEach(function(c) {
			if (c1.indexOf(c) == -1) c1.push(c);
		})
		
		elem.className = c1.join(" "); 
	}

	/**
	* Remove a CSS rule on an Element
	*
	* Parameters :
	*	elem : Element, the Element to modify
	*	css : String, the CSS rule to remove from the Element
	* Return : none
	*/
	static RemoveCss(elem, css) {				
		var c1 = elem.className.split(" ");
		var c2 = css.split(" ");
		
		elem.className = c1.filter(function(c) { return c2.indexOf(c) == -1; }).join(" ");
	}

	/**
	* Verify that an Element contains a CSS rule
	*
	* Parameters :
	*	elem : Element, the Element to verify
	*	css : String, the CSS rule to find
	* Return : Boolean, true if the Element contains the CSS rule, false otherwise
	*/
	static HasCss(elem, css) {
		return (' ' + elem.className + ' ').indexOf(' ' + css + ' ') > -1;
	}

	/**
	* Set the CSS rules on an Element
	*
	* Parameters :
	*	elem : Element, the Element to modify
	*	css : String, the CSS rule to set on the Element
	* Return : none
	*/
	static SetCss(elem, css) {
		elem.className = css; 
	}

	/**
	* Toggle a CSS rule on or or off for an Element
	*
	* Parameters :
	*	elem : Element, the Element to modify
	*	css : String, the CSS rule to toggle on the Element
	*	enabled : Boolean, true to toggle the CSS rule on, false to toggle it off
	* Return : none
	*/
	static ToggleCss(elem, css, enabled) {
		if (enabled) this.AddCss(elem, css);
		
		else this.RemoveCss(elem, css);
	}
	
	/**
	* Get an attribute value from an Element
	*
	* Parameters :
	*	elem : Element, the Element to retrieve the attribute from
	*	attr : String, the name of the attribute to retrieve
	* Return : String, the value of the attribute if found, null otherwise
	*/
	static GetAttribute(elem, attr) {
		var attr = elem.attributes.getNamedItem(attr);
		
		return attr ? attr.value : null;
	}
	
	/**
	* Set an attribute value on an Element
	*
	* Parameters :
	*	elem : Element, the Element to set the attribute on
	*	attr : String, the name of the attribute to set
	*	value : String, the value of the attribute to set
	* Return : none
	*/
	static SetAttribute(elem, attr, value) {
		elem.setAttribute(attr, value);
	}
	
	/**
	* Get the size of an Element
	*
	* Parameters :
	*	elem : Element, the Element to retrieve the size
	* Return : Object, an object literal containing the size of the Element
	* 
	* { 
	*	w: width of the Element, 
	*	h: height of the Element 
	* }
	*/
	static Size(elem) {
		var style = window.getComputedStyle(elem);
		
		var h = +(style.getPropertyValue("height").slice(0, -2));
		var w = +(style.getPropertyValue("width").slice(0, -2));
		var pL = +(style.getPropertyValue("padding-left").slice(0, -2));
		var pR = +(style.getPropertyValue("padding-right").slice(0, -2));
		var pT = +(style.getPropertyValue("padding-top").slice(0, -2));
		var pB = +(style.getPropertyValue("padding-bottom").slice(0, -2));
		
		var w = w - pL - pR;
		var h = h - pT - pB;
		
		// Use smallest width as width and height for square grid that fits in container
		// var s = w < h ? w : h;
		
		return { w : w , h : h }
	}
	
	/**
	* Get the siblings of an Element
	*
	* Parameters :
	*	elem : Element, the Element to retrieve the siblings
	* Return : Array, An array of elements containing the siblings of the input element
	*/
	static Siblings(elem) {
		var elements = [];
		
		for (var i = 0; i < elem.parentNode.children.length; i++) elements.push(elem.parentNode.children[i]);
		
		elements.splice(elements.indexOf(elem), 1);
		
		return elements;
	}
	
	
	/**
	* Returns the geometry of a dom node (width, height)
	*
	* Parameters :
	*	elem : Element, the Element to retrieve the geometry
	* Return : Object, an object containing the width and height of the element
	*/
	static Geometry(elem) {
		var style = window.getComputedStyle(elem);
		
		var h = +(style.getPropertyValue("height").slice(0, -2));
		var w = +(style.getPropertyValue("width").slice(0, -2));
		var pL = +(style.getPropertyValue("padding-left").slice(0, -2));
		var pR = +(style.getPropertyValue("padding-right").slice(0, -2));
		var pT = +(style.getPropertyValue("padding-top").slice(0, -2));
		var pB = +(style.getPropertyValue("padding-bottom").slice(0, -2));
		
		var w = w - pL - pR;
		var h = h - pT - pB;
		
		// Use smallest width as width and height for square grid that fits in container
		// var s = w < h ? w : h;
		
		return { w : w , h : h }
	}
}