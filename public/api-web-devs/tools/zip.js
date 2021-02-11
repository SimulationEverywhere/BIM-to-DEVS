import Core from '../tools/core.js';

if (!streamSaver) throw new Error("streamSaver is undefined, did you add it as a script?");
if (!ZIP) throw new Error("zip-stream is undefined, did you add it as a script?");
if (!zip) throw new Error("zip is undefined, did you add it as a script?");

zip.workerScriptsPath = "../api-web-devs/references/zip/";
		
export default class Zip {
	
	static SaveZipStream(name, files) {
		// TODO : All this should be done on the server, otherwise 4GB limit
		const readableZipStream = new ZIP({
			start (ctrl) {
				files.forEach(f => ctrl.enqueue(f));
			},
			async pull (ctrl) {
				ctrl.close();
			}
		});
		
		const fileStream = streamSaver.createWriteStream(name + '.zip'/*, {
			size: 22, // (optional) Will show progress
			writableStrategy: undefined, // (optional)
			readableStrategy: undefined  // (optional)
		  }*/);

		return readableZipStream.pipeTo(fileStream);
	}
	
	static LoadZip(blob) {
		var d = Core.Defer();
		
		var r = new zip.BlobReader(blob);
		
		var created = (reader) => {	Zip.ReadZip(reader).then(finished, failure); }
		
		var finished = (result) => { d.Resolve({ files:result }); }

		var failure = (error) => { d.Reject(error); }
		
		zip.createReader(r, created, (ev) => { failure(new Error("Unable to create zipReader.")) });
		
		return d.promise;
	}

	static ReadEntry(entry) {
		var d = Core.Defer();
		
		entry.getData(new zip.TextWriter(), function(text) {
			var blob = new Blob([text], { type: "text/plain" });
			var file = new File([blob], entry.filename);

			d.Resolve(file);
		});
		
		return d.promise;
	}

	static ReadZip(reader) {
		var d = Core.Defer();
		
		reader.getEntries(function(entries) {
			var defs = entries.map(e => { return Zip.ReadEntry(e); });
			
			Promise.all(defs).then(function(files) {
				reader.close();
				
				// var files = data.map(d => { return d; });
						
				d.Resolve(files);	
			});
		});
				
		return d.promise;
	}
}