d3.csv("/data/state_changing_3D_computerLab.csv", function(data) {
	window.changedata = [];
	window.legendOFF = true;
	
	window.max_x = d3.max(data, d => +d.x) + 1;
	window.max_y = d3.max(data, d => +d.y) + 1;
	window.max_z = d3.max(data, d => +d.z) + 1;

	var allPosition = [];

	var times = [];
	
    for(var i=0;i<data.length;i++){
		var idx = times.indexOf(data[i].time);
		
		if (idx == -1) {
			times.push(data[i].time);		
			idx = times.length - 1;
			window.changedata[idx] = [];
        }
		window.changedata[idx].push({x:+data[i].x, y:+data[i].y, z:+data[i].z, state:+data[i].current_state});

		if (!allPosition[data[i].x]) {
			allPosition[data[i].x] = [];
			allPosition[data[i].x][data[i].y] = [];
		}
		else if (!allPosition[data[i].x][data[i].y]){
			allPosition[data[i].x][data[i].y] = [];
		}

		allPosition[data[i].x][data[i].y][data[i].z] = true;
	}

	window.unique = [];
	for (var x = 0; x < allPosition.length; x++) {
		for (var y = 0;  allPosition[x] && y < allPosition[x].length; y++) {
			for(var z = 0; allPosition[x][y] && z < allPosition[x][y].length; z++)
			if (allPosition[x][y][z]) window.unique.push({x:x, y:y, z:z});
		}
	}
});
