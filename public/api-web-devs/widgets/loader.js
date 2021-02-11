'use strict';

import Core from '../tools/core.js';
import Dom from '../tools/dom.js';
import Net from '../tools/net.js';
import Zip from '../tools/zip.js';
import oSettings from '../components/settings.js';
import Styler from '../components/styler.js';
import Templated from '../components/templated.js';
import ChunkReader from '../components/chunkReader.js';
import BoxInput from '../ui/box-input-files.js';

import Standardized from '../parsers/standardized.js';
import SimulationDEVS from '../simulation/simulationDEVS.js';
import SimulationCA from '../simulation/simulationCA.js';

// A lot of async going on, sorry.
export default Core.Templatable("Widget.Loader", class Loader extends Templated { 
	
	get Files() {
		return this.Widget("dropzone").files;
	}
	
	get Disabled() {
		return this.Elem("parse").disabled;
	}

	static get URL() {
		return Core.config.parsing;
	}
	
	constructor(node) {		
		super(node);
		
        if (!Core.ConfigCheck("parsing")) throw new Error("Config Error: parsing url not defined in application configuration.");
				
		this.Node("parse").On("click", this.onParseButton_Click.bind(this));
		this.Node("clear").On("click", this.onClearButton_Click.bind(this));
		this.Widget("dropzone").On("change", this.onDropzone_Change.bind(this));
	}
	
	UpdateButton() {		
		this.Elem("parse").disabled = (this.Files.length == 0);
	}
		
	onDropzone_Change(ev) {		
		this.UpdateButton();
	}
		
	onParseButton_Click(ev) {
		Dom.RemoveCss(this.Elem("wait"), "hidden");
		
		this.Parse(this.Files);
	}
	
	onClearButton_Click(ev) {
		this.Widget("dropzone").Clear();
		
		this.UpdateButton();
	}
	
	Parse(files) {
		var defs = [];
		
		var structure = files.find(f => f.name == "structure.json");
		var messages = files.find(f => f.name == "messages.log");
		var options = files.find(f => f.name == "options.json");
		var palette = files.find(f => f.name.match(/.pal/i));
		
		if (structure && messages) defs.push(this.ParseStandardized(files));
		
		else defs.push(this.ParseFiles(files));
		
		if (options) defs.push(this.ParseJson(options));
				
		Promise.all(defs).then(this.OnStandardized_Parsed.bind(this), (error) => this.OnError(error));
	}
	
	// TODO : REturn settings
	ParseJson(file) {		
		var reader = new ChunkReader();
		
		return reader.Read(file, (json) => JSON.parse(json));
	}
	
	ParseStandardized(files) {
		var d = Core.Defer();
		var parser = new Standardized();
		
		parser.On("Progress", this.OnStandardized_Progress.bind(this));
		
		parser.Parse(files).then(response => d.Resolve(response), (error) => d.Reject(error));
		
		return d.promise;
	}
		
	ParseFiles(files) {
		var d = Core.Defer();
		var form = new FormData();
		
		files.forEach(f => form.append("files", f));
		
		var diagram = files.find(f => f.name.match(/.svg/i)) || null;
		
		var p = this.Request(Loader.URL, { method: 'POST', body: form });
		
		p.then(this.onAuto_Parsed.bind(this, d, diagram), (error) => { d.Reject(error); });
		
		return d.promise;
	}
	
	Request(url, options){
		var d = Core.Defer();
		var p = fetch(Loader.URL, options);
		
		p.then((response) => {
			if (response.status == 200) d.Resolve(response);
			
			else response.text().then((text) => fail(new Error(text)), fail);
		}, fail);
		
		function fail(error) {
			d.Reject(error);
		}
		
		return d.promise;
	}
	
	onAuto_Parsed(d, diagram, response) {
		response.blob().then(blob => {			
			Zip.LoadZip(blob).then(this.OnZip_Read.bind(this, d, diagram), (error) => { d.Reject(error); });
		}, (error) => { d.Reject(error); });
	}
	
	OnZip_Read(d, diagram, response) {
		if (diagram) {
			var blob = diagram.slice(0, diagram.size);
			
			response.files.push(new File([blob], 'diagram.svg', {type: diagram.type}));
		}
		
		this.ParseStandardized(response.files).then(result => d.Resolve(result), (error) => d.Reject(error));
	}
	
	OnStandardized_Progress(ev) {		
		// TODO : Should use variable css colors			
		var c1 = "#198CFF";
		var c2 = "#0051A3";
		
		var bg = `linear-gradient(to right, ${c1} 0%, ${c1} ${ev.progress}%, ${c2} ${ev.progress}%, ${c2} 100%)`;
		
		this.Elem("parse").style.backgroundImage = bg;		
	}
	
	OnStandardized_Parsed(responses) {	
		this.Finish();

		var simulation = responses[0].simulation;

		if (simulation.Type == "DEVS" && !simulation.Diagram) {
			alert("Diagram not found for DEVS simulation. Please provide a diagram.svg file and reload the simulation.");
		} 

		var options = responses[1] ? oSettings.FromJson(responses[1]) : oSettings.FromSimulation(responses[0].simulation);

		if (!options.styler) {
			if (responses[0].style) options.styler = Styler.FromJson(responses[0].style);
			
			else options.styler = Styler.Default();
		} 
		
		var output = {
			files: responses[0].files,
			simulation: responses[0].simulation,
			options : options
		}
		
		this.Emit("ready", output);
	}

	OnError(error) {
		this.Finish();
		
		this.Emit("error", { error:error });
	}

	Finish() {
		Dom.AddCss(this.Elem("wait"), "hidden");
		
		this.Elem("parse").style.backgroundImage = null;	
	}

	Template() {
		return "<div class='loader'>" +
				  "<div handle='wait' class='wait hidden'><img src='./assets/loading.svg'></div>" + 
			      "<div handle='dropzone' widget='Widget.Box-Input-Files'></div>" +
				  "<div>" +
					 "<button handle='clear' class='clear'>nls(Loader_Clear)</button>" +
					 "<button handle='parse' class='parse' disabled>nls(Loader_Parse)</button>" +
			      "</div>" +
			   "</div>";
	}
});
