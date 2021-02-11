'use strict';

import Core from '../tools/core.js';
import Dom from '../tools/dom.js';
import Net from '../tools/net.js';
import Templated from '../components/templated.js';

export default Core.Templatable("Widget.RiseList", class RiseLoader extends Templated {

    constructor(id) {
        super(id);
		
        if (!Core.ConfigCheck("rise")) throw new Error("Config Error: rise url not defined in application configuration.");

		var path = Core.config.rise;
		
		// TODO : This is temporary, just to showcase how we could read from RISE. We need
		// to fix a bunch of issues with RISE before we can fully implement this.
		this.models = [{
				"name": "Alternate Bit Protocol",
				"type" : "DEVS",
				"url": path + "/ABP/"
			}, {
				"name": "Crime and Drugs",
				"type" : "Cell-DEVS",
				"url": path + "/Crime and Drugs/Final/"
			}, {
				"name": "Classroom CO2",
				"type" : "Cell-DEVS",
				"url": path + "/CO2/"
			}, {
				"name": "COVID",
				"type" : "Cell-DEVS",
				"url": path + "/COVID/"
			}, {
				"name": "Employee Behaviour",
				"type" : "Cell-DEVS",
				"url": path + "/Employee Behaviour/2/"
			}, {
				"name": "Agricultural Farm",
				"type" : "DEVS",
				"url": path + "/Farm/"
			}, {
				"name": "Fire Spread",
				"type" : "Cell-DEVS",
				"url": path + "/Fire/"
			}, {
				"name": "Fire And Rain",
				"type" : "Cell-DEVS",
				"url": path + "/Fire and Rain/"
			}, {
				"name": "Food Chain",
				"type" : "Cell-DEVS",
				"url": path + "/Food Chain/"
			}, {
				"name": "Logistic Urban Growth Model #1",
				"type" : "Cell-DEVS",
				"url": path + "/LUG/1/"
			}, {
				"name": "Logistic Urban Growth Model #2",
				"type" : "Cell-DEVS",
				"url": path + "/LUG/2/"
			}, {
				"name": "Logistic Urban Growth Model #3",
				"type" : "Cell-DEVS",
				"url": path + "/LUG/3/"
			}, {
				"name": "Lynx & Hare",
				"type" : "Cell-DEVS",
				"url": path + "/Lynx Hare/"
			}, {
				"name": "Sheeps on a Ranch",
				"type" : "Cell-DEVS",
				"url": path + "/Ranch/hot/"
			}, {
				"name": "Settlement Growth",
				"type" : "Cell-DEVS",
				"url": path + "/Settlement Growth/"
			}, {
				"name": "Smog",
				"type" : "Cell-DEVS",
				"url": path + "/Smog/"
			}, {
				"name": "Tumor Growth",
				"type" : "Cell-DEVS",
				"url": path + "/Tumor/"
			}, {
				"name": "UAV Search",
				"type" : "Cell-DEVS",
				"url": path + "/UAV/"
			}, {
				"name": "Worm",
				"type" : "Cell-DEVS",
				"url": path + "/Worm/"
			}, {
				"name": "Worm Spread",
				"type" : "Cell-DEVS",
				"url": path + "/Worm Spreading/"
			}
		]
		
		this.models.forEach(m => this.AddModel(m));
    }

	AddModel(model) {
		var li = Dom.Create("li", { className:'model' }, this.Elem('list'));
		
		li.innerHTML = model.name;
		
		li.addEventListener("click", this.onLiModelClick_Handler.bind(this, model));
	}
	
    onLiModelClick_Handler(model, ev){
		this.Emit("ModelSelected", { model : model });
		
        this.getRiseModel(model);
    }

    getRiseModel(model){
		Dom.RemoveCss(this.Elem("wait"), "hidden");

		var p1 = Net.Request(`${model.url}structure.json`, null, 'blob');
		var p2 = Net.Request(`${model.url}messages.log`, null, 'blob');
		
		if (model.type == "Cell-DEVS") var p3 = Net.Request(`${model.url}style.json`, null, 'blob');
		
		if (model.type == "DEVS") var p3 = Net.Request(`${model.url}diagram.svg`, null, 'blob');

		var defs = [p1, p2, p3];
		
		var success = function(responses) {	
			Dom.AddCss(this.Elem("wait"), "hidden");	
			
			var options = responses[2];
	
			var files = [];
			
			files.push(new File([responses[0]], 'structure.json'));
			files.push(new File([responses[1]], 'messages.log'));
			if (model.type == "Cell-DEVS") files.push(new File([responses[2]], 'style.json'));
			
			if (model.type == "DEVS") files.push(new File([responses[2]], 'diagram.svg'));
			
			this.Emit("filesready", { files : files });
		}.bind(this);

		Promise.all(defs).then(success, this.onError_Handler.bind(this));
    }

	onError_Handler(error) {
		Dom.AddCss(this.Elem("wait"), "hidden");
		
		this.Emit("error", { error:error });
	}

    Template(){
        return "<div class='rise-loader'>" + 
				  "<div handle='wait' class='wait hidden'><img src='./assets/loading.svg'></div>" + 
				  "<ul handle='list'></ul>" + 
			   "</div>";
    }
});
