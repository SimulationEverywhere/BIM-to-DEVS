'use strict';

import Core from '../tools/core.js';
import Dom from '../tools/dom.js';
import Templated from '../components/templated.js';

export default Core.Templatable("Widget.Playback", class Playback extends Templated { 

	get IsLooping() { return this.settings.Get("playback", "loop"); } 
	
	get Interval() { return 1000 / this.settings.Get("playback", "speed") }

	set Recorder(value) {
		this.recorder = value;
		
		Dom.ToggleCss(this.Elem("record"), "hidden", !value);
	}
	
	get Recording() {
		return (this.recorder) ? this.recorder.Recording : false;
	}

	constructor(node) {
		super(node);
		
		this.current = 0;
		this.interval = null;
		this.direction = null;
		
		this.Enable(false);
		
		this.Node("first").On("click", this.onFirstClick_Handler.bind(this));
		this.Node("stepBack").On("click", this.onStepBackClick_Handler.bind(this));
		this.Node("rewind").On("click", this.onRewindClick_Handler.bind(this));
		this.Node("play").On("click", this.onPlayClick_Handler.bind(this));
		this.Node("stepForward").On("click", this.onStepForwardClick_Handler.bind(this));
		this.Node("last").On("click", this.onLastClick_Handler.bind(this));
		this.Node("slider").On("input", this.onSliderChange_Handler.bind(this));
		this.Node("record").On("click", this.onRecordClick_Handler.bind(this));
	}
	
	Initialize(simulation, settings) {
		this.simulation = simulation;
		this.settings = settings;
		
		this.simulation.On("Session", this.onSimulationSession_Handler.bind(this));
		
		this.values = this.simulation.Frames.map((f) => { return f.time; });
		
		this.min = 0;
		this.max = this.values.length - 1;
		
		this.Elem("slider").setAttribute("min", this.min);
		this.Elem("slider").setAttribute("max", this.max);
		
		this.SetCurrent(this.min);
		
		this.Enable(true);
	}
	
	Enable (isEnabled) {
		this.Elem("first").disabled = !isEnabled;
		this.Elem("stepBack").disabled = !isEnabled;
		this.Elem("rewind").disabled = !isEnabled;
		this.Elem("play").disabled = !isEnabled;
		this.Elem("stepForward").disabled = !isEnabled;
		this.Elem("last").disabled = !isEnabled;
		this.Elem("slider").disabled = !isEnabled;
		this.Elem("record").disabled = !isEnabled;
	}
	
	SetCurrent(i) {
		this.current = i;
		
		this.Elem("label").innerHTML = this.values[this.current];
		this.Elem("slider").value = this.current;
	}
	
	Stop() {
		var d = this.direction;
		
		this.direction = null;
		
		if (this.interval) clearInterval(this.interval);
		
		Dom.SetCss(this.Elem("rewind"), "fas fa-backward");
		Dom.SetCss(this.Elem("play"), "fas fa-play");
		
		return d;
	}
	
	Play(loop, interval) {		
		this.direction = "play";
		
		this.interval = setInterval(function(){ 
			if (this.current < this.max) this.GoToNext();
		
			else if (loop) this.GoTo(this.min);
			
			else this.Stop();
		}.bind(this), interval);
	}
	
	Rewind(loop, interval) {
		this.direction = "rewind";
		
		this.interval = setInterval(function(){ 
			if (this.current > this.min) this.GoToPrevious();
		
			else if (loop) this.GoTo(this.max);
			
			else this.Stop();
		}.bind(this), interval);
	}
	
	GoToPrevious() {
		this.SetCurrent(--this.current);
		
		this.simulation.GoToPreviousFrame();
	}
	
	GoToNext() {
		this.SetCurrent(++this.current);
		
		this.simulation.GoToNextFrame();
	}
	
	GoTo(i) {
		this.SetCurrent(i);
		
		this.simulation.GoToFrame(i);
	}
	
	onFirstClick_Handler(ev) {
		this.Stop();
		
		this.GoTo(this.min);
	}
	
	onStepBackClick_Handler(ev) {
		this.Stop();
		
		if (this.current > this.min) this.GoToPrevious();
		
		else if (this.IsLooping, this.GoTo(this.max));
	}
	
	onRewindClick_Handler(ev) {
		if (this.Stop() == "rewind") return;
		
		Dom.SetCss(this.Elem("rewind"), "fas fa-pause");
		
		this.Rewind(this.IsLooping, this.Interval);
	}
	
	onPlayClick_Handler(ev) {
		if (this.Stop() == "play") return;
		
		Dom.SetCss(this.Elem("play"), "fas fa-pause");
		
		this.Play(this.IsLooping, this.Interval);
	}
	
	onStepForwardClick_Handler(ev) {
		this.Stop();
		
		if (this.current < this.max) this.GoToNext();
		
		else if (this.IsLooping) this.GoTo(this.min)
	}
	
	onLastClick_Handler(ev) {
		this.Stop();
		
		this.GoTo(this.max);
	}
	
	onRecordClick_Handler(ev) {
		if (this.recorder.Recording) {
			Dom.SetCss(this.Elem("record"), "fas fa-circle record");
			
			this.recorder.Stop().then(e => {
				this.recorder.Download(this.simulation.Name);
			});
		}
		else {
			Dom.SetCss(this.Elem("record"), "fas fa-square record");
			
			this.recorder.Start();
		}
	}
	
	onSliderChange_Handler(ev) {
		this.Stop();
		
		this.GoTo(+ev.target.value);
	}
	
	onSimulationSession_Handler(ev) {
		this.SetCurrent(this.simulation.State.i);
	}
	
	Template() {
		return "<div class='playback'>" +
				  "<div class='controls'>" +
				     "<button handle='first' title='nls(Playback_FastBackward)' class='fas fa-fast-backward'></button>" +
				     "<button handle='stepBack' title='nls(Playback_StepBack)' class='fas fa-step-backward'></button>" +
				     "<button handle='rewind' title='nls(Playback_Backwards)' class='fas fa-backward'></button>" +
				     "<button handle='play' title='nls(Playback_Play)' class='fas fa-play'></button>" +
				     "<button handle='stepForward' title='nls(Playback_StepForward)' class='fas fa-step-forward'></button>" +
				     "<button handle='last' title='nls(Playback_FastForward)' class='fas fa-fast-forward'></button>" +
			      "</div>" + 
			      "<input handle='slider' class='slider' title='nls(Playback_Seek)' type='range' min='0' max='1'>" +
			      "<label handle='label' class='label'>00:00:00:00</label>" + 
			      "<button handle='record' title='nls(Playback_Record)' class='fas fa-circle record hidden'></button>" +
		       "</div>" ;
	}
});