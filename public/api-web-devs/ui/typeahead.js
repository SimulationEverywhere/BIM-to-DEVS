import Templated from './templated.js';
import Core from '../tools/core.js';
import Dom from '../tools/dom.js';

export default Core.Templatable("Basic.Components.Typeahead", class Typeahead extends Templated {
	
	
    set placeholder(value) { this.Elem('input').setAttribute('placeholder', value); }
	
	set title(value) { this.Elem('input').setAttribute('title', value); }
	
	set items(value) {		
		this._items = value.map(i => {
			var li = Dom.Create("li", { innerHTML : i.label, tabIndex : -1 });
			var item = { data : i, node : li };
			
			li.addEventListener("mousedown", this.onLiClick_Handler.bind(this, item));
			
			return item; 
		});
	}
	
	set current(value) {
		this._curr = value;
	}
	
	get current() {
		return this._curr;
	}
	
	constructor(container, options) {	
		super(container, options);
		
		this._items = null;
		this._filt = null;
		this._curr = null;
		this._temp = null;
		
		this.Node("input").On("input", function(ev) { this.OnInputInput_Handler(ev); }.bind(this));	

		// this.Node("input").On("click", this.OnInputClick_Handler.bind(this));
		this.Node("input").On("keydown", function(ev) { this.OnInputKeyDown_Handler(ev); }.bind(this));		
		this.Node("input").On("blur", function(ev) { this.OnInputBlur_Handler(ev); }.bind(this));		
		this.Node("input").On("focusin", function(ev) { this.OnInputClick_Handler(ev); }.bind(this));		
		// this.Node("input").On("focusout", this.OnInputBlur_Handler.bind(this));
		
		if (!options) return;
		
		this.items = options.items;
	}
	
	Empty() {		
		Dom.Empty(this.Elem("list"));
		
		this._filt = [];
	}
	
	Fill(mask) {		
		this._filt = this._items.filter(i => compare(i.data.label, mask));
		
		var frag = document.createDocumentFragment();
		
		for (var i = 0; i < this._filt.length; i++) {
			var curr = this._filt[i];
			
			// Maybe insert <b> at right index instead, faster?
			curr.node.innerHTML = curr.data.label.replace(mask, `<b>${mask}</b>`);
			curr.next = this._filt[(i + 1) % this._filt.length];
			curr.next.prev = curr;
		
			Dom.Place(curr.node, frag);
		}
				
		Dom.Place(frag, this.Elem("list"));
		
		function compare(label, mask) {
			return label.toLowerCase().indexOf(mask.toLowerCase()) !== -1
		}
	}
	
	UpdateCss() {		
		Dom.ToggleCss(this.Elem("root"), "collapsed", this._filt.length == 0);
	}
	
	Reset() {
		if (this._temp) Dom.SetCss(this._temp.node, "");
			
		this._temp = null;
		
		this.Empty();
		
		var value = this.current ? this.current.data.label : "";
		
		this.Elem("input").value = value;
	}
	
	OnInputInput_Handler(ev) {
		if (ev.target.value.length < 3) return;
		
		this.Empty();
		
		this.Fill(ev.target.value);
		
		this.UpdateCss();
	}
	
	OnInputClick_Handler(ev) {			
		if (ev.target.value.length < 3) return;
		
		this.Fill(ev.target.value);
		
		this.UpdateCss();
	}
	
	OnInputKeyDown_Handler(ev) {		
		// prevent default event on specifically handled keys
		if (ev.keyCode == 40 || ev.keyCode == 38 || ev.keyCode == 13 || ev.keyCode == 27) ev.preventDefault();

		// shift + up : select text
		if (ev.shiftKey == true &&  ev.keyCode == 38)  this.nodes.Input.select();
		
		// up or down key : cycle through dropdown
		else if (ev.keyCode == 40 || ev.keyCode == 38 ) {	
			this._temp = this._temp || this._filt[this._filt.length - 1];
			
			Dom.SetCss(this._temp.node, "");
			
			this._temp = (ev.keyCode == 40) ? this._temp.next : this._temp.prev;
			
			this.Elem("input").value = this._temp.data.label;
			
			this.ScrollTo(this._temp);
			
			Dom.SetCss(this._temp.node, "active");
		}

		// enter : select currently focused
		else if (ev.keyCode == 13){
			// if an item is currently selected through arrows, select that one
			if (this._temp) this.onLiClick_Handler(this._temp);
			
			// if a filtered list is being shown, select the first item
			else if (this._filt.length > 0) this.onLiClick_Handler(this._filt[0]);

			// nothing is selected (don't think this can happen		    	
			else {				
				this.OnInputClick_Handler({ target:this.Elem("input") });
			}
		}

		// if escape key
		else if (ev.keyCode == 27) this.OnInputBlur_Handler();	
	}
	
	OnInputBlur_Handler(ev) {			
		this.Reset();
		
		this.UpdateCss();
	}
	
	onLiClick_Handler(item, ev) {		
		this.current = item;
				
		this.Reset();
		
		this.UpdateCss();
		
		this.Emit("Change", { item:item.data });
	}
	
	ScrollTo(item) {				
		// create rectangules to know the position of the elements
		var ul = this.Elem("list");
		var liBx = item.node.getBoundingClientRect();
		var ulBx = ul.getBoundingClientRect();
		
		//if the element is in this range then it is inside the main container, don't scroll
		if (liBx.bottom > ulBx.bottom) ul.scrollTop = ul.scrollTop + liBx.bottom - ulBx.top - ulBx.height;
		
		else if (liBx.top < ulBx.top) ul.scrollTop = ul.scrollTop + liBx.top - ulBx.top;
	}
	
	Template() {        
		return "<div handle='root' class='typeahead collapsed'>" +
				 "<input handle='input' type='text' class='input' placeholder='nls(Typeahead_Title)' title='nls(Typeahead_Title)'>" + 
			     "<ul handle='list' class='list'></ul>" +
			   "</div>";
	}
})