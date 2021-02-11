import Dom from '../tools/dom.js';
import Core from '../tools/core.js';
import Templated from '../components/templated.js';

export default class Popup extends Templated { 
	
	set Title(value) {
		this.Elem("title").innerHTML = value;
	}
	
	set Content(content) {
		this.Empty();
		
		this.content = content;
		
		content.Place(this.Elem("body"));
	}
	
	get Content() { return this.content; }
	
	constructor(container) {	
		super(container || document.body);
		
		this.defer = null;
		
		this.onBody_KeyUp_Bound = this.onBody_KeyUp.bind(this);
		
		this.h = null;
		
		this.nodes.blocker = Dom.Create("div", { className:"popup-blocker" }, document.body);
		
		this.SetStyle(0, "hidden");
		
		this.Node("close").On("click", this.onBtnClose_Click.bind(this));
		this.Node("blocker").On("click", this.onModal_Click.bind(this));
	}
	
	SetStyle(opacity, visibility) {
		this.Elem("blocker").style.opacity = opacity;
		this.Elem("blocker").style.visibility = visibility;
		this.Elem("popup").style.opacity = opacity;
		this.Elem("popup").style.visibility = visibility;
	}
	
	Empty() {
		Dom.Empty(this.Elem("body"));
	}
	
	Show() {	
		this.defer = Core.Defer();
	
		this.h = document.body.addEventListener("keyup", this.onBody_KeyUp_Bound);
		
		this.SetStyle(1, "visible");
		
		this.Emit("Show", { popup:this });
		
		this.Elem("close").focus();
		
		return this.defer.promise;
	}
	
	Hide() {		
		document.body.removeEventListener("keyup", this.onBody_KeyUp_Bound);
		
		this.SetStyle(0, "hidden");
		
		this.Emit("Hide", { popup:this });
		
		this.defer.Resolve();
	}
	
	onBody_KeyUp(ev) {
		if (ev.keyCode == 27) this.Hide();
	}
	
	onModal_Click(ev) {
		this.Hide();
	}
	
	onBtnClose_Click(ev) {
		this.Emit("Close", { popup:this });
		
		this.Hide();
	}
	
	Template() {
		return "<div handle='popup' class='popup'>" +
				  "<div class='popup-header'>" +
					  "<h2 class='popup-title' handle='title'></h2>" +
					  "<button class='close' handle='close' title='nls(Popup_Close)'>×</button>" +
				  "</div>" +
				  "<div class='popup-body' handle='body'></div>" +
				  "<div class='popup-footer' handle='footer'></div>" +
			   "</div>";
	}
}