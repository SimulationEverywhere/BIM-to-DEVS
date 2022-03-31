import { GisTool } from './GISintegration.js';
// import Loader from './loading.js'

let geometry;

export default class PointCloudExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
		this._group = null;
        this._button = null;

        //gis added
        this.tool = new GisTool();

        this.zaxisOffset = -1.5;

        //offsets for house model
        this.xaxisOffset = 0.275;
        this.yaxisOffset = 0.08;

        //offsets for office model
        // this.xaxisOffset = 0.49;
        // this.yaxisOffset = 0.51;

        this.pointSize = 50;
    }

    load() {
        // window.renderPointCloud = false;
        // console.log('Point Cloud extension loaded')
        // var loader = new Loader(); //this loads the button
        // var simulationData = 
        // loader.start();
        // console.log(test.simulationObj);
        // this._renderCloud(simulationData);
        // return true;

        //gis added
        this.viewer.toolController.registerTool(this.tool);
        console.log('GisToolExtension loaded.');
        // var loader = new Loader();
        // loader.start
        return true;
        
    }

    _renderCloud(){
      //  if(renderPointCloud){
            this.points = this._generatePointCloud();
            this.points.scale.set(179,139, 5); //House Match size with project size. (unit: inch)
            //this.points.scale.set(114,76, 5); //Ofc
            this.viewer.impl.createOverlayScene('pointclouds');
            this.viewer.impl.addOverlay('pointclouds', this.points);
      //  }
    }

    unload() {
		//   // Clean our UI elements if we added any
        //  if (this._group) {
        //     this._group.removeControl(this._button);
        //     if (this._group.getNumberOfControls() === 0) {
        //         this.viewer.toolbar.removeControl(this._group);
        //     }
        // }
        // console.log('PointCloudExtension has been unloaded');
        // return true;

        //gis added
        this.viewer.toolController.deregisterTool(this.tool);
        if (this._group) {
            this._group.removeControl(this._button);
            if (this._group.getNumberOfControls() === 0) {
                this.viewer.toolbar.removeControl(this._group);
            }
        }
        console.log('GisToolExtension unloaded.');
        return true;
    }
    
    /**
     * Generates {@link https://github.com/mrdoob/three.js/blob/r71/src/core/BufferGeometry.js|BufferGeometry}
     * with (_width_ x _length_) positions and varying colors. The resulting geometry will span from -0.5 to 0.5
     * in X and Y directions, and the Z value and colors are computed as functions of the X and Y coordinates.
     *
     * Based on https://github.com/mrdoob/three.js/blob/r71/examples/webgl_interactive_raycasting_pointcloud.html.
     *
     * @param {number} width Number of points along the X axis.
     * @param {number} length Number of points along the Y axis.
     * @returns {BufferGeometry} Geometry that can be used by {@link https://github.com/mrdoob/three.js/blob/r71/src/objects/PointCloud.js|PointCloud}.
     */
    _generatePointCloudGeometry() {
        let geometry = new THREE.BufferGeometry();
        let numPoints = simulation.MaxX * simulation.MaxY;
		let positions = new Float32Array(numPoints * 3);
        let colors = new Float32Array(numPoints * 3);
        let color = new THREE.Color();

        for (var i = 0; i < simulation.Frames.length; i++){
            var frame = simulation.Frames[i];
            for (var j = 0; j < frame.StateMessages.length; j++) {
                var m = frame.StateMessages[j];

                let k = m.X * simulation.MaxY + m.Y;
                let u = m.X / simulation.MaxX - this.xaxisOffset;
                let v = m.Y / simulation.MaxY - this.yaxisOffset;

                positions[3 * k] = u;
                positions[3 * k + 1] = v;
                positions[3 * k + 2] = this.zaxisOffset;

                color.setRGB(255/255, 255/255, 255/255);
                color.toArray(colors, k * 3);
            }
        }

		geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeBoundingBox();
        geometry.isPoints = true; // This flag will force Forge Viewer to render the geometry as gl.POINTS
        
		return geometry;
    }

    _generatePointCloud() {
        geometry = this._generatePointCloudGeometry();

        var vShader = `uniform float size;
        varying vec3 vColor;
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size * ( size / (length(mvPosition.xyz) + 0.00001) );
            gl_Position = projectionMatrix * mvPosition;
        }`
        // var fShader = `varying vec3 vColor;
        // void main() {
        //     gl_FragColor = vec4( vColor, 1.0 );
        // }`

        var fShader = `varying vec3 vColor;
        uniform sampler2D sprite;
        void main() {
            gl_FragColor = vec4(vColor, 1.0 ) * texture2D( sprite, gl_PointCoord );
            if (gl_FragColor.x < 0.2) discard;
        }`

        var material = new THREE.ShaderMaterial( {
            uniforms: {
                size: { type: 'f', value: this.pointSize},
                sprite: { type: 't', value: THREE.ImageUtils.loadTexture("./particle_1.png") },
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
        // this._group = this.viewer.toolbar.getControl('allMyAwesomeExtensionsToolbar');
        // if (!this._group) {
        //     this._group = new Autodesk.Viewing.UI.ControlGroup('allMyAwesomeExtensionsToolbar');
        //     this.viewer.toolbar.addControl(this._group);
        // }

        // // Add a new button to the toolbar group
        // this._button = new Autodesk.Viewing.UI.Button('myAwesomeExtensionButton');
        // this._button.onClick = (ev) => {
            
        //     window.renderPointCloud = true;
        //     this._renderCloud();
        //     if(window.legendOFF){
        //         this._appearLegend();
        //         window.legendOFF = false;
        //     }

        //     var i = 0;
                
        //     var interval = setInterval(() => {
        //         this._updatePointCloudGeometry(simulation.Frames[i]);
        //         if (++i == simulation.Frames.length) window.clearInterval(interval);
        //     }, 50);
        // };

        // this._button.setToolTip('Sim Object');
        // this._button.addClass('connectCadmiumIcon');
        // this._group.addControl(this._button);

        //gis added
        // Create a new toolbar group if it doesn't exist
        this._group = this.viewer.toolbar.getControl('allMyAwesomeExtensionsToolbar');
        if (!this._group) {
            this._group = new Autodesk.Viewing.UI.ControlGroup('allMyAwesomeExtensionsToolbar');
            this.viewer.toolbar.addControl(this._group);
        }

        const controller = this.viewer.toolController;

        // Add a new button to the toolbar group
        this._button = new Autodesk.Viewing.UI.Button('myAwesomeExtensionButton');
        this._button.onClick = (ev) => {
            const isActivated = controller.isToolActivated('gis-tool');
            if(isActivated){
                controller.deactivateTool('gis-tool');
                this._button.setState(Autodesk.Viewing.UI.Button.State.INACTIVE);
            } else {
                controller.activateTool('gis-tool');
                this._button.setState(Autodesk.Viewing.UI.Button.State.ACTIVE);
            }
            
            // window.renderPointCloud = true;
            // this._renderCloud();
            // if(window.legendOFF){
            //     this._appearLegend();
            //     window.legendOFF = false;
            // }
        };

        this._button.setToolTip('GIS Tool');
        this._button.addClass('connectCadmiumIcon');
        this._group.addControl(this._button);
    }

    _updatePointCloudGeometry(frame) {
        var colors = this.points.geometry.attributes.color.array;
        let percent = 0;

        var color1 = {r:0,g:0,b:255};
        var color2 = {r:255,g:255,b:255};
        var color3 = {r:255,g:0,b:0};
        var colorRange = {min:100, mid:500, max:1200}

        for (var i = 0; i < frame.StateMessages.length; i++) {
            var m = frame.StateMessages[i];
           
            var v = m.Value.concentration;

            let r;
            let g;
            let b;

            if(v <= colorRange.min){
                r = color1.r;
                g = color1.g;
                b = color1.b;
            }else if(v < colorRange.mid){
                percent = (v - colorRange.min) / (colorRange.mid - colorRange.min);
                r = color1.r + percent * (color2.r - color1.r);
                g = color1.g + percent * (color2.g - color1.g);
                b = color1.b + percent * (color2.b - color1.b);
            }else if(v == colorRange.mid){
                r = color2.r;
                g = color2.g;
                b = color2.b;
            }else if(v > colorRange.mid && v < colorRange.max){
                percent = (v - colorRange.mid) / (colorRange.max - colorRange.mid);
                r = color2.r + percent * (color3.r - color2.r);
                g = color2.g + percent * (color3.g - color2.g);
                b = color2.b + percent * (color3.b - color2.b);
            }else{
                r = color3.r;
                g = color3.g;
                b = color3.b;
            }

            let k = m.X * simulation.MaxY + m.Y;
            //this.points.geometry.attributes.position.array[3 * k + 2] = (1/3) * w + this.zaxisOffset;
            
            // //Select color
            // let r = (w>0)?1:1+w;                 //r=1 when 0<w<1
            // let g = (w>0)?1-w:1+w;   //g=1 when w==1
            // let b = (w>0)?1-w:1;       //b=1 when -1<w<0

            let color = new THREE.Color();
            color.setRGB(r/255,g/255,b/255);
            colors[3 * k] = color.r;       // r=1 when 0<w<1
            colors[3 * k + 1] = color.g;   // g=1 when w==1
            colors[3 * k + 2] = color.b;   // b=1 when -1<w<0
        }
        //this.points.geometry.attributes.position.needsUpdate=true;
        this.points.geometry.attributes.color.needsUpdate=true;
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
                    {offset: "36.36%", color: "#FFFFBE"},
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
                .domain([100,500,1200])
                .range([0,100,290])

                var axisLeg = d3.axisBottom(xLeg);

                svgLegend
                    .attr("class", "axis")
                    .append("g")
                    .attr("transform", "translate(10, 40)")
                    .call(axisLeg);
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('PointCloudExtension', PointCloudExtension);
