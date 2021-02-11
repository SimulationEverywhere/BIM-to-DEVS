'use strict';

import Core from '../tools/core.js';

export default class Recorder { 
	
	get Recording() {
		return this.recording;
	}
	
	constructor(canvas) {		
		this.canvas = canvas;
		this.chunks = null;
		this.recording = false;
		
		var options;
		
		if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
			options = { mimeType: 'video/webm; codecs=vp9' };
		} 
		else {
			options = { mimeType: 'video/webm; codecs=vp8' };
		} 
		
		this.recorder = new MediaRecorder(canvas.captureStream(), options); // init the recorder
		
		// every time the recorder has new data, we will store it in our array
		this.recorder.ondataavailable = (function(ev) {
			if (event.data && event.data.size > 0) {
				this.chunks.push(ev.data);
			}
		}).bind(this);
	}	
	
	Start() {
		this.recording = true;
		
		this.chunks = [];
		
		this.recorder.start();
	}
	
	Stop() {
		this.recording = false;
		
		var d = Core.Defer();
		
		this.recorder.onstop = e => d.Resolve();
		
		this.recorder.stop();
		
		return d.promise;
	}
	
	Download(name) {
		// TODO : check if can use net.Download
		if (this.chunks.length == 0) return;
		
		var blob = new Blob(this.chunks, { type: 'video/webm' });
		var url = URL.createObjectURL(blob);
		var a = document.createElement('a');
		
		document.body.appendChild(a);
		
		a.style = 'display: none';
		a.href = url;
		a.download = name + '.webm';
		a.click();
		
		window.URL.revokeObjectURL(url);
	}
}