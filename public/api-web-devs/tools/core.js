'use strict';

let _nls = null;
let _locale = null;
let _templatables = {}

export default class Core {
	
	/**
	* Gets the nls ressources
	*
	* Return : Object, an object containing the nls ressources
	*/
    static get nls() { return _nls; }
	
	/**
	* Sets the nls ressources
	*/
    static set nls(value) { _nls = value; }
	
	/**
	* Gets the locale String
	*
	* Return : String, a String containing the locale
	*/
    static get locale() { return _locale; }
	
	/**
	* Sets the locale String
	*/
    static set locale(value) { _locale = value; }
	
	/**
	* Get a localized nls string ressource
	*
	* Parameters :
	*	id : String, the id of the nls ressource to retrieve
	*	subs : Array(String), an array of Strings to substitute in the localized nls string ressource
	*	locale : String, the locale for the nls ressource
	* Return : String, the localized nls string ressource
	*/
	static Nls(id, subs, locale) {
		if (!this.nls) throw new Error("Nls content not set.");
		
		var itm = this.nls[id];

		if (!itm) throw new Error("Nls String '" + id + "' undefined.");

		var txt = itm[(locale) ? locale : this.locale];

		if (txt === undefined || txt === null) throw new Error("String does not exist for requested language.");

		return this.Format(txt, subs);
	}
		
	/**
	* A convenience function to get a deffered object for asynchronous processing. 
	* Removes one level of nesting when working with promises
	*
	* Parameters :
	*	none
	* Return : Object, an object with a Resolve and Reject function
	*
	* { 
	*	promise: the promise object associated to the asynchronous process, 
	*	Resolve: a function to resolve the promise, 
	*	Reject: a function to reject the promise 
	* }
	*/
	static Defer() {
		var defer = {};
		
		defer.promise = new Promise((resolve, reject) => {
			defer.Resolve = (result) => { resolve(result); };
			defer.Reject = (error) => { reject(error); };
		});
		
		defer.Resolved = (value) => {
			defer.Resolve(value);
			
			return defer.promise;
		}
		
		defer.Rejected = (error) => {
			defer.Reject(error);
			
			return defer.promise;
		}
		
		return defer;
	}
	
	/**
	* Get or set a templated class definition, this is required to nest Templated UI 
	* components within other Templated UI components.
	*
	* Parameters :
	*	id : String, the id of the templated class definition to get or set
	*	definition : Class, when specified, the class definition to set 
	* Return : Class, the class definition created  
	*/
	static Templatable(id, definition) {
		if (definition) {
			if (_templatables[id]) throw new Error(`Templatable ${id} is defined multiple times.`);
			
			else _templatables[id] = definition;
		}
		else if (!_templatables[id]) throw new Error(`Templatable ${id} is not defined.`);
		
		return _templatables[id];
	}
	
	/**
	* Get an Array of class definitions by matching its
	*
	* Parameters :
	*	id : String, the id of the nls ressource to retrieve
	*	subs : Array(String), an array of Strings to substitute in the localized nls string ressource
	*	locale : String, the locale for the nls ressource
	* Return : String, the localized nls string ressource
	*/
	static Templated(namespace) {
		var templated = [];
		
		for (var id in _templatables) {
			if (id.match(namespace)) templated.push(_templatables[id]);
		}
		
		return templated;
	}
	
	/**
	* Merges an object into another object. 
	*
	* Parameters :
	*	a : Object, the object that will receive the properties 
	*	b : Object, the object to merge into object A
	* Return : the modified Object
	*/
	static Mixin(a, b) {				
		for (var key in b) {
			if (b.hasOwnProperty(key)) a[key] = b[key];
		}

		// TODO : Why did I use arguments[0] instead of a?
		return arguments[0];
	}
	
	/**
	* Debounces a function. The function will be executed after a timeout 
	* unless the function is called again in which case, the timeout will
	* reset
	*
	* Parameters :
	*	delegate : Function, the Function to debounce
	*	threshold : Integer, the timeout length, in milliseconds
	* Return : Function, the debounced function
	*/
	static Debounce(delegate, threshold) {
		var timeout;
	
		return function debounced () {
			
			function delayed () {
				delegate.apply(this, arguments);
				
				timeout = null; 
			}
	 
			if (timeout) clearTimeout(timeout);
	 
			timeout = setTimeout(delayed.bind(this), threshold || 100); 
		};
	}
	
	/**
	* Formats a String using substitute strings
	*
	* Parameters :
	*	str : String, the String to format
	*	subs : Array(String), An array of Strings to substitute into the String
	* Return : String, the formatted String
	*/
	static Format(str, subs) {
		if (!subs || subs.length == 0) return str;
		
		var s = str;

		for (var i = 0; i < subs.length; i++) {
			var reg = new RegExp("\\{" + i + "\\}", "gm");
			s = s.replace(reg, subs[i]);
		}

		return s;
	}
	
	/**
	* Disables or enables all focusable elements in an array of nodes
	*
	* Parameters :
	*	nodes : Array of DOM elements, the DOM elements where focusable elements will be disabled or enabled
	*	disabled : Boolean, True to disable, False to enable
	*/
	static DisableFocusable(nodes, disabled) {
		var focusable = ["button", "fieldset", "input", "optgroup", "option", "select", "textarea"];
		
		nodes.forEach(n => {
			var selection = n.querySelectorAll(focusable);
			
			if (selection.length == 0) return;
			
			for (var i = 0; i < selection.length; i++) selection[i].disabled = disabled;
		});
	}	
	
	static RgbToHex(rgb) {
		return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
	}
	
	static HexToRgb(hex) {
		var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		
		return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
	}
	
	static WaitForDocument() {
		var d = Core.Defer();
		
		if (document.readyState === "complete") d.Resolve();
		
		else window.addEventListener('load', (ev) => d.Resolve());
		
		return d.promise;
	}
	
	static ConfigCheck(field) {
		return Core.config[field] != undefined;
	}
}