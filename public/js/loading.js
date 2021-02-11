import  Standardized from "../api-web-devs/parsers/standardized.js";
import Core from "../api-web-devs/tools/core.js"
import Net from "../api-web-devs/tools/net.js"
import Zip from "../api-web-devs/tools/zip.js"
import Evented from '../api-web-devs/components/evented.js'
import oSettings from '../api-web-devs/components/settings.js'

export default class Loader{

    start(){
        console.log("Loader is getting called"); 

        var requests = [];

        requests.push(Net.File('http://localhost:3000/filesToUpload/house_4_windows.json', 'scenario.json'));
        requests.push(Net.File('http://localhost:3000/filesToUpload/output_messages_house.txt', 'messages.txt'));

        // requests.push(Net.File('http://localhost:3000/filesToUpload/InputScenario__OfficeModel.json', 'scenario.json'));
        // requests.push(Net.File('http://localhost:3000/filesToUpload/output_messages_Ofc.txt', 'messages.txt'));
        

        Promise.all(requests).then(files => this.Parse(files));

    }

    Parse(files){
        var defs = [];
		
		// var structure = files.find(f => f.name == "structure.json");
		// var messages = files.find(f => f.name == "messages.log");
		// var options = files.find(f => f.name == "options.json");
		// var palette = files.find(f => f.name.match(/.pal/i));
		
		//if (structure && messages) defs.push(this.ParseStandardized(files));
		
        //else 
        defs.push(this.ParseFiles(files));
		
		//if (options) defs.push(this.ParseJson(options));
				
		Promise.all(defs).then(this.OnStandardized_Parsed.bind(this), (error) => this.OnError(error));
        
    }

    ParseStandardized(files) {
		var d = Core.Defer();
		var parser = new Standardized();
				
		parser.Parse(files).then(response => d.Resolve(response), (error) => d.Reject(error));
		
		return d.promise;
	}
     
    ParseFiles(files){

        var d = Core.Defer();
		var form = new FormData();
		
		files.forEach(f => form.append("files", f));
		
		var diagram = files.find(f => f.name.match(/.svg/i)) || null;
		
		var p = this.Request("http://206.12.94.204:8080/sim.services.1.2/parser/auto", { method: 'POST', body: form });
		
		p.then(this.onAuto_Parsed.bind(this, d, diagram), (error) => { d.Reject(error); });
		
		return d.promise;
        
    }

    Request(url, options){
		var d = Core.Defer();
        var p = fetch("http://206.12.94.204:8080/sim.services.1.2/parser/auto", options);
        //var p = fetch(url, options);
		
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
		this.ParseStandardized(response.files).then(result => d.Resolve(result), (error) => d.Reject(error));
    }


	OnStandardized_Parsed(responses) {	

		var simulation = responses[0].simulation;

		if (simulation.Type == "DEVS" && !simulation.Diagram) {
			alert("Diagram not found for DEVS simulation. Please provide a diagram.svg file and reload the simulation.");
		} 

		var options = responses[1] ? oSettings.FromJson(responses[1]) : oSettings.FromSimulation(responses[0].simulation);

		// if (!options.styler) {
		// 	if (responses[0].style) options.styler = Styler.FromJson(responses[0].style);
			
		// 	else options.styler = Styler.Default();
		// } 
		
		var output = {
			files: responses[0].files,
			simulation: responses[0].simulation,
			options : options
		}
		
		window.simulation = output.simulation;
        // window.simulationData = {
        //     dataFrame :[],
        //     max_X: output.simulation.MaxX,
        //     max_Y: output.simulation.MaxY
        // };
		// //this.Emit("ready", output);

        // var data = output.simulation.frames;
        // //var .dataFrame = []
        // if(data){
        //     for (let index = 0; index < data.length -1 ; index++) {
                
        //         var arr =[];

        //         for (let idx = 0; idx < data[index].messages.state.length - 1; idx++) {
        //             //const element = array[index];
        //             var cordX = data[index].messages.state[idx].emitter[0];
        //             var cordY = data[index].messages.state[idx].emitter[1];
        //             var value = parseInt(data[index].messages.state[idx].value["concentration"]); 

        //             arr.push({"x":cordX,"y":cordY,"state":value}) 
        //         }
        //        // dataFrame.insert(index,arr);
        //        window.simulationData.dataFrame.splice(index,0,arr);
        //     }    
        // }
        alert('Finished loading')
    }
    
    OnError(error) {		
        var emit = new Evented();
        emit.Emit("error", { error:error })
		//this.Emit("error", { error:error });
	}
}
