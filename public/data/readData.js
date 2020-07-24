d3.csv("/data/state_changing.csv", function(data) {
	window.data = [];
	window.legendOFF = true;
	
	window.max_x = d3.max(data, d => +d.x) + 1;
	window.max_y = d3.max(data, d => +d.y) + 1;
	
	// window.changedata = [];
	// var coordinate = [];


	var times = [];
	
    for(var i=0;i<data.length;i++){
		var idx = times.indexOf(data[i].time);
		
		if (idx == -1) {
			times.push(data[i].time);		
			idx = times.length - 1;
			window.data[idx] = [];
        }
        
		window.data[idx].push({ x:+data[i].x, y:+data[i].y, state:+data[i].current_state });

    }
});