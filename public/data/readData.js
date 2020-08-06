d3.csv("/data/state_changing.csv", function(data) {
	window.changedata = [];
	window.legendOFF = true;
	
	window.max_x = d3.max(data, d => +d.x) + 1;
	window.max_y = d3.max(data, d => +d.y) + 1;
	
	var allPosition = [];

	var times = [];
	
    for(var i=0;i<data.length;i++){
		var idx = times.indexOf(data[i].time);
		
		if (idx == -1) {
			times.push(data[i].time);		
			idx = times.length - 1;
			window.changedata[idx] = [];
        }
        
		window.changedata[idx].push({ x:+data[i].x, y:+data[i].y, state:+data[i].current_state });
		allPosition.push({x:data[i].x, y:data[i].y, state:data[i].current_state});
	}

	//window.unique = allPosition.filter( onlyUnique );
});

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}
