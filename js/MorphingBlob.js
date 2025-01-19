class MorphingBlob {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }

        // Mobile detection
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isLowEnd = this.isMobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
        
        // Simplified configuration
        this.options = {
            size: options.size || { 
                width: this.isMobile ? window.innerWidth * 0.8 : 300,
                height: this.isMobile ? window.innerWidth * 0.8 : 300
            },
            color: options.color || new THREE.Color(0.8, 0.7, 0.7),
            background: options.background || 0x000000,
            opacity: options.opacity || 1
        };

        // Basic renderer setup
        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            powerPreference: "low-power",
            precision: this.isLowEnd ? "lowp" : "mediump",
            alpha: true,
            stencil: false,
            depth: false
        });

        const pixelRatio = this.isLowEnd ? 0.75 : 1;
        this.renderer.setPixelRatio(pixelRatio);
        this.renderer.setSize(this.options.size.width, this.options.size.height);
        this.renderer.info.autoReset = true;

        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            this.isMobile ? 60 : 75,
            this.options.size.width / this.options.size.height,
            0.1,
            1000
        );
        this.camera.position.z = this.isMobile ? 4 : 3;

        this.renderer.setSize(this.options.size.width, this.options.size.height);
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);

        this.createBlob();
        this.renderer.render(this.scene, this.camera);
    }

    createBlob() {
        const segments = this.isLowEnd ? 12 : 24;
        const geometry = new THREE.SphereGeometry(1, segments, segments);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: this.options.color }
            },
            vertexShader: `
                #ifdef GL_ES
                precision ${this.isLowEnd ? 'lowp' : 'mediump'} float;
                #endif
                varying vec3 vNormal;
                
                void main() {
                    vNormal = normal;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                #ifdef GL_ES
                precision ${this.isLowEnd ? 'lowp' : 'mediump'} float;
                #endif
                uniform vec3 color;
                varying vec3 vNormal;
                
                void main() {
                    float light = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
                    gl_FragColor = vec4(color * light, 1.0);
                }
            `,
            transparent: true
        });

        material.extensions = {
            derivatives: false,
            fragDepth: false,
            drawBuffers: false,
            shaderTextureLOD: false
        };

        this.blob = new THREE.Mesh(geometry, material);
        this.scene.add(this.blob);
    }

    dispose() {
        if (this.blob) {
            this.blob.geometry.dispose();
            this.blob.material.dispose();
        }
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
    }
}
