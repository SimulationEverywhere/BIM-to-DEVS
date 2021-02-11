'use strict';

import Core from '../tools/core.js';
import Dom from '../tools/dom.js';
import Templated from '../components/templated.js';

export default Core.Templatable("Widget.Box-Button", class Dropzone extends Templated { 

	set Label(value) { this.Elem("label").innerHTML = value; }

	set Icon(value) { Dom.AddCss(this.Elem("icon"), value); }

	constructor(container) {
		super(container);
		
		this.Elem("button").On("click", this.OnButton_Click.bind(this));
	}
	
	Template() {
		return "<div class='box'>" +
				  "<label handle='label'></label>" +
				  "<i handle='icon' class='fas'></i>" +
				  "<button handle='button'/>" +
			   "</div>";
	}
	
	OnButton_Click(ev) {
		this.Emit("Click", { });
	}
});