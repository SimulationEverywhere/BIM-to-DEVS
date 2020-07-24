window.onload = function() {
    var colorScale = d3.scaleLinear()
        .domain([0,	10,	15,	20, 25, 100])
        .range(['#E28672', '#EC93AB', '#CEB1DE', '#95D3F0', '#77EDD9', '#A9FCAA']);
  
    // append a defs (for definition) element to your SVG
      var svgLegend = d3.select('#legend').append('svg');
      var defs = svgLegend.append('defs');
  
      // append a linearGradient element to the defs and give it a unique id
      var linearGradient = defs.append('linearGradient')
          .attr('id', 'linear-gradient');
  
      // horizontal gradient
      linearGradient
          .attr("x1", "0%")
          .attr("y1", "0%")
          .attr("x2", "100%")
          .attr("y2", "0%");
  
      // append multiple color stops by using D3's data/enter step
      linearGradient.selectAll("stop")
          .data([
              {offset: "0%", color: "#E28672"},
              {offset: "10%", color: "#EC93AB"},
              {offset: "15%", color: "#CEB1DE"},
              {offset: "20%", color: "#95D3F0"},
              {offset: "25%", color: "#77EDD9"},
              {offset: "100%", color: "#A9FCAA"}
          ])
          .enter().append("stop")
          .attr("offset", function(d) { 
              return d.offset; 
          })
          .attr("stop-color", function(d) { 
              return d.color; 
          });
  
      // append title
      svgLegend.append("text")
          .attr("class", "legendTitle")
          .attr("x", 0)
          .attr("y", 20)
          .style("text-anchor", "left")
          .text("Legend title");
  
      // draw the rectangle and fill with gradient
      svgLegend.append("rect")
          .attr("x", 0)
          .attr("y", 30)
          .attr("width", 300)
          .attr("height", 15)
          .style("fill", "url(#linear-gradient)");
  
      //create tick marks
      var xLeg = d3.scaleLinear()
          .domain([0, 100])
          .range([0, 300]);
  
      var axisLeg = d3.axisBottom(xLeg);
  
      svgLegend
          .attr("class", "axis")
          .append("g")
          .attr("transform", "translate(0, 40)")
          .call(axisLeg);
  }