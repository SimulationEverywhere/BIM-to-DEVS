let geometry;
let time = 0;

class PointCloudExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
		this._group = null;
        this._button = null;

        this.zaxisOffset = -1;
        this.pointSize = 25;
    }

    load() {
        this.points = this._generatePointCloud();
        this.points.scale.set(30.7, 30.7, 5); //Match size with project size. (unit: inch)
        this.viewer.impl.createOverlayScene('pointclouds');
        this.viewer.impl.addOverlay('pointclouds', this.points);

        return true;
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
        let numPoints = max_y * max_y;
		let positions = new Float32Array(numPoints * 3);
        let colors = new Float32Array(numPoints * 3);
        let color = new THREE.Color();
        let k = 0;
        
        for (var i = 0; i < max_x; i++) {
            for (var j = 0; j < max_y; j++) {
                let u = i / max_x - 0.015;
                let v = j / max_y + 0.028;

                positions[3 * k] = u;
                positions[3 * k + 1] = v;
                positions[3 * k + 2] = this.zaxisOffset;
				
				color.setRGB(1, 1, 1);
                color.toArray(colors, k * 3);
                k++;
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
        var fShader = `varying vec3 vColor;
        uniform sampler2D sprite;
        void main() {
            gl_FragColor = vec4(vColor, 1.0 ) * texture2D( sprite, gl_PointCoord );
            if (gl_FragColor.x < 0.2) discard;
        }`

        var material = new THREE.ShaderMaterial( {
            uniforms: {
                size: { type: 'f', value: this.pointSize},
                sprite: { type: 't', value: THREE.ImageUtils.loadTexture("./particle.png") },
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
        this._group = this.viewer.toolbar.getControl('allMyAwesomeExtensionsToolbar');
        if (!this._group) {
            this._group = new Autodesk.Viewing.UI.ControlGroup('allMyAwesomeExtensionsToolbar');
            this.viewer.toolbar.addControl(this._group);
        }

        // Add a new button to the toolbar group
        this._button = new Autodesk.Viewing.UI.Button('myAwesomeExtensionButton');
        this._button.onClick = (ev) => {
            var i = 0;
                
            var interval = setInterval(() => {
                this._updatePointCloudGeometry(data[i]);
                if (++i == data.length) window.clearInterval(interval);
            }, 30);
        };

        this._button.setToolTip('PointCloud Extension');
        this._button.addClass('pointcloudIcon');
        this._group.addControl(this._button);
    }

    _updatePointCloudGeometry(messages) {
        var colors = this.points.geometry.attributes.color.array;
        let w = 0;

        for (var i = 0; i < messages.length; i++) {
            var m = messages[i];

            if(m.state < 500){
                w = (m.state - 500) / 100;
            }else if(m.state == 500){
                w = 0;
            }else{
                w = (m.state - 500) / 690;
            }

            let k = m.x * max_y + m.y;
            this.points.geometry.attributes.position.array[3 * k + 2] = (1/3) * w + this.zaxisOffset;
            
            //Select color
            let color = new THREE.Color();
            let r = (w>0)?1:1+w;                 //r=1 when 0<w<1
            let g = (w>0)?(w>1?0:(1-w)):(1+w);   //g=1 when w==1
            let b = (w>0)?(w>1?0:(1-w)):1;       //b=1 when -1<w<0

            color.setRGB(r,g,b);
            colors[3 * k] = color.r;       // r=1 when 0<w<1
            colors[3 * k + 1] = color.g;   // g=1 when w==1
            colors[3 * k + 2] = color.b;   // b=1 when -1<w<0
        }

        this.points.geometry.attributes.position.needsUpdate=true;
        this.points.geometry.attributes.color.needsUpdate=true;
        this.viewer.impl.invalidate(true,false,true);
        time++; 
    }
}


Autodesk.Viewing.theExtensionManager.registerExtension('PointCloudExtension', PointCloudExtension);