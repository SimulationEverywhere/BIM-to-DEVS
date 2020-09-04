let geometry;

class PointCloudExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
		this._group = null;
        this._button = null;

        // this.xaxisOffset = -0.52; // [office model]
        // this.yaxisOffset = -0.52; // [office model]
        this.xaxisOffset = 0; // [computer lab]
        this.yaxisOffset = 0; // [computer lab]
        this.zaxisOffset = -1.5;
        this.pointSize = 30; //default PointCloud size
        this.transparent = 0.5; //default PointCloud transparency

        this.allPointClouds = false;
        this.horizontalFlag = false;
        this.verticalFlag = false;
    }

    load() {
        this._renderCloud();
        return true;
    }

    _renderCloud(){
        this.points = this._generatePointCloud();
        // this.points.scale.set(108,73, 5); //Match size with project size. (unit: inch) [office model]
        this.points.scale.set(38,57, 12); //Match size with project size. (unit: inch) [computer lab]
        this.viewer.impl.createOverlayScene('pointclouds');
        this.viewer.impl.addOverlay('pointclouds', this.points);
    }

    unload() {
		  // Clean our UI elements if we added any
         if (this._group) {
            this._group.removeControl(this._button);
            if (this._group.getNumberOfControls() === 0) {
                this.viewer.toolbar.removeControl(this._group);
            }
        }
        console.log('PointCloudExtension has been unloaded');
        return true;
    }

    _generatePointCloudGeometry() {
        let geometry = new THREE.BufferGeometry();

        let numPoints = unique.length;
		let positions = new Float32Array(numPoints * 3);
        let colors = new Float32Array(numPoints * 3);
        let uvs = new Float32Array(numPoints * 2);
        let color = new THREE.Color();

        for(var i = 0; i<unique.length; i++){
            positions[3 * i] = unique[i].x / max_x + this.xaxisOffset;
            positions[3 * i + 1] = unique[i].y / max_y + this.yaxisOffset;
            positions[3 * i + 2] = unique[i].z / max_z + this.zaxisOffset;
            color.setRGB(255/255, 255/255, 255/255);
            color.toArray(colors, i * 3);
            uvs[2 * i] = this.pointSize;
            uvs[2 * i + 1] = 0;
        }

        //Add Attribute to geometry
		geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geometry.computeBoundingBox();
        geometry.isPoints = true; // This flag will force Forge Viewer to render the geometry as gl.POINTS
        
		return geometry;
    }

    _generatePointCloud() {
        geometry = this._generatePointCloudGeometry();

        var vShader = `varying vec3 vColor;
        varying vec2 vUv;
        void main() {
            vUv = uv;
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize =  vUv.x * ( vUv.x / (length(mvPosition.xyz) + 0.00001));
            gl_Position = projectionMatrix * mvPosition;
        }`

        //fShader for Sprite
        var fShader = `varying vec3 vColor;
        varying vec2 vUv;
        uniform sampler2D sprite;
        void main() {
            gl_FragColor = vec4(vColor,vUv.y) * texture2D( sprite, gl_PointCoord );
            if (gl_FragColor.x < 0.2) discard;
        }`

        // // fShader for Regular PointClouds
        // var fShader = `varying vec3 vColor;
        // varying vec2 vUv;
        // void main() {
        //     gl_FragColor = vec4( vColor, vUv.y );
        // }`

        var material = new THREE.ShaderMaterial( {
            uniforms: {
                sprite: { type: 't', value: THREE.ImageUtils.loadTexture("./white.png") },
            },
            vertexShader: vShader,
            fragmentShader: fShader,
            transparent: true,
            vertexColors: true,
        });

        return new THREE.PointCloud(geometry, material);
    }
	
	onToolbarCreated() {
        // Create a new toolbar group if it doesn't exist
        this._group = this.viewer.toolbar.getControl('Extensions Toolbar');
        if (!this._group) {
            this._group = new Autodesk.Viewing.UI.ControlGroup('Extensions Toolbar');
            this.viewer.toolbar.addControl(this._group);
        }

        // Add the button for 'PointClouds ON/OFF'
        this._button = new Autodesk.Viewing.UI.Button('PointClouds ON/OFF');
        this._button.onClick = (ev) => {
            this._showTangentPlane('ALL');
        };
        this._button.setToolTip('PointClouds ON/OFF');
        this._button.addClass('pointcloudIcon');
        this._group.addControl(this._button);

        // Add the button for 'View the Simulation'
        this._button = new Autodesk.Viewing.UI.Button('View the Simulation');
        this._button.onClick = (ev) => {
            if(this.allPointClouds){ //Simulation only run when PointClouds are showing
                if(!window.legendON){
                    this._appearLegend(); //Appear the color legend
                    window.legendON = true;
                }
                var i = 0;
                var interval = setInterval(() => {
                    this._viewSimulation(changedata[i]);
                    if (++i == changedata.length) window.clearInterval(interval);
                }, 22.5);
            }
        };
        this._button.setToolTip('View the Simulation');
        this._button.addClass('pointcloudIcon');
        this._group.addControl(this._button);

        // Add the button for 'Vertical Tangent Plane View'
        this._button = new Autodesk.Viewing.UI.Button('Vertical Tangent Plane View');
        this._button.onClick = (ev) => {
            if(this.allPointClouds){ // Button only work when PointClouds are showing
                this._showTangentPlane('vertical');
            }
        };
        this._button.setToolTip('Vertical Tangent Plane View');
        this._button.addClass('pointcloudIcon');
        this._group.addControl(this._button);

        // Add the button for 'Horizontal Tangent Plane View'
        this._button = new Autodesk.Viewing.UI.Button('Horizontal Tangent Plane View');
        this._button.onClick = (ev) => {
            if(this.allPointClouds){ // Button only work when PointClouds are showing
                this._showTangentPlane('horizontal');
            }
        };
        this._button.setToolTip('Horizontal Tangent Plane View');
        this._button.addClass('pointcloudIcon');
        this._group.addControl(this._button);
    }

    _viewSimulation(messages) {
        var colors = this.points.geometry.attributes.color.array;
        var uvs = this.points.geometry.attributes.uv.array;

        for (var i = 0; i < messages.length; i++) {
            var m = messages[i];
            var color1 = {r:0,g:0,b:255};
            var color2 = {r:255,g:255,b:255};
            var color3 = {r:255,g:0,b:0};
            var concRange = {min:250, mid:500, max:690};
            var sizeRange = {min:0.8, mid:1, max:1.5};
            var transRange = {min:0.3, mid:0.5, max:1.0};
            let r;
            let g;
            let b;
            let percent = 0;
            let sizePercent;
            let transPercent;

            // Color, size and transparency dynamic changes dependent on CO2 concentration
            if(m.state <= concRange.min){
                r = color1.r;
                g = color1.g;
                b = color1.b;
                sizePercent = sizeRange.min;
                transPercent = transRange.min;
            }else if(m.state > concRange.min && m.state < concRange.mid){
                percent = (m.state - concRange.min) / (concRange.mid - concRange.min);
                r = color1.r + percent * (color2.r - color1.r);
                g = color1.g + percent * (color2.g - color1.g);
                b = color1.b + percent * (color2.b - color1.b);
                sizePercent = sizeRange.min + percent * (sizeRange.mid - sizeRange.min);
                transPercent = transRange.min + percent * (transRange.mid - transRange.min);
            }else if(m.state == concRange.mid){
                r = color2.r;
                g = color2.g;
                b = color2.b;
                sizePercent = sizeRange.mid;
                transPercent = transRange.mid;
            }else if(m.state > concRange.mid && m.state < concRange.max){
                percent = (m.state - concRange.mid) / (concRange.max - concRange.mid);
                r = color2.r + percent * (color3.r - color2.r);
                g = color2.g + percent * (color3.g - color2.g);
                b = color2.b + percent * (color3.b - color2.b);
                sizePercent = sizeRange.mid + percent * (sizeRange.max - sizeRange.mid);
                transPercent = transRange.mid + percent * (transRange.max - transRange.mid);
            }else{
                r = color3.r;
                g = color3.g;
                b = color3.b;
                sizePercent = sizeRange.max;
                transPercent = transRange.max;
            }

            let k = unique.findIndex(obj => obj.x === m.x && obj.y === m.y && obj.z === m.z); //find the index for this PointCloud

            let color = new THREE.Color();
            color.setRGB(r/255,g/255,b/255);
            colors[3 * k] = color.r;
            colors[3 * k + 1] = color.g;
            colors[3 * k + 2] = color.b;
            uvs[2 * k] = this.pointSize * sizePercent; //Dynamic size change

            //Dynamic transparency change
            if(this.verticalFlag && this.horizontalFlag){ //Both horizontal and vitical part hid, change on part PointClouds.
                if(!(unique[k].z > 4 || unique[k].x > max_x/2)){
                    uvs[2 * k + 1] = transPercent;
                }
            }else if(this.verticalFlag){ //Only vitical part hid, change on part of PointClouds.
                if(!(unique[k].z > 4)){
                    uvs[2 * k + 1] = transPercent;
                }
            }else if(this.horizontalFlag){
                if(!(unique[k].x > max_x/2)){ //Only horizontal part hid, change on part of PointClouds.
                    uvs[2 * k + 1] = transPercent;
                }
            }else{ //PointCloud all showing, change on all PointClouds.
                uvs[2 * k + 1] = transPercent;
            }
        }
        this.points.geometry.attributes.color.needsUpdate=true;
        this.points.geometry.attributes.uv.needsUpdate=true;
        this.viewer.impl.invalidate(true,false,true);
    }

    _showTangentPlane(section){
        var uvs = this.points.geometry.attributes.uv.array;
        if(section == 'ALL'){ //Button 'PointClouds ON/OFF' pressed.
            if(this.allPointClouds){
                for(var i = 0; i < unique.length; i++){
                    uvs[2 * i + 1] = 0;
                }
                this.allPointClouds = false;
            } else{
                for(var i = 0; i < unique.length; i++){
                    uvs[2 * i + 1] = this.transparent;
                }
                this.horizontalFlag = false;
                this.verticalFlag = false;
                this.allPointClouds = true;
            }
        } else if(section == 'vertical'){ //Button 'Vertical Tangent Plane View' pressed.
            if(this.verticalFlag && this.horizontalFlag){ //Both horizontal and vitical part hid, show part PointClouds.
                for(var i = 0; i < unique.length; i++){
                    if(unique[i].z > 4 && !(unique[i].x > max_x/2)){
                        uvs[2 * i + 1] = this.transparent;
                    }
                }
                this.verticalFlag = false;
            }else if(this.verticalFlag) { //Only vitical part hid, show all PointClouds.
                for(var i = 0; i < unique.length; i++){
                    if(unique[i].z > 4){
                        uvs[2 * i + 1] = this.transparent;
                    }
                }
                this.verticalFlag = false;
            }else{ //PointCloud all showing, hide vertical side.
                for(var i = 0; i < unique.length; i++){
                    if(unique[i].z > 4){
                        uvs[2 * i + 1] = 0;
                    }
                }
                this.verticalFlag = true;
            }
        } else if(section == 'horizontal'){ //Button 'Horizontal Tangent Plane View' pressed.
            if(this.verticalFlag && this.horizontalFlag){ //Both horizontal and vitical part hid, show part PointClouds.
                for(var i = 0; i < unique.length; i++){
                    if(unique[i].x > max_x/2 && !(unique[i].z > 4)){
                        uvs[2 * i + 1] = this.transparent;
                    }
                }
                this.horizontalFlag = false;
            }else if(this.horizontalFlag){ //Only horizontal part hid, show all PointClouds.
                for(var i = 0; i < unique.length; i++){
                    if(unique[i].x > max_x/2){
                        uvs[2 * i + 1] = this.transparent;
                    }
                }
                this.horizontalFlag = false;
            }else{ //PointCloud all showing, hide vertical side.
                for(var i = 0; i < unique.length; i++){
                    if(unique[i].x > max_x/2){
                        uvs[2 * i + 1] = 0;
                    }
                }
                this.horizontalFlag = true;
            }
        }
        this.points.geometry.attributes.uv.needsUpdate=true;
        this.viewer.impl.invalidate(true,false,true);
    }

    _appearLegend(){
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
                    {offset: "0%", color: "#0000FF"},
                    {offset: "67.80%", color: "#FFFFFF"},
                    {offset: "100%", color: "#FF0000"}
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
                .style("text-anchor", "mid")
                .text("CO2 Concentration (ppm)");
        
            // draw the rectangle and fill with gradient
            svgLegend.append("rect")
                .attr("x", 0)
                .attr("y", 30)
                .attr("width", 300)
                .attr("height", 15)
                .style("fill", "url(#linear-gradient)");
        
                //create tick marks
                var xLeg = d3.scale.ordinal()
                .domain([100,500,690])
                .range([0,185,290])

                var axisLeg = d3.axisBottom(xLeg);

                svgLegend
                    .attr("class", "axis")
                    .append("g")
                    .attr("transform", "translate(10, 40)")
                    .call(axisLeg);
            }
}


Autodesk.Viewing.theExtensionManager.registerExtension('PointCloudExtension', PointCloudExtension);