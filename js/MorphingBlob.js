class MorphingBlob {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }

        // Specific Android detection
        this.isAndroid = /Android/i.test(navigator.userAgent);
        
        // Base configuration with reduced complexity
        this.options = {
            size: options.size || { width: 300, height: 300 },
            color: options.color || new THREE.Color(0.8, 0.7, 0.7),
            speed: this.isAndroid ? 0.5 : (options.speed || 1),
            amplitude: this.isAndroid ? 0.05 : (options.amplitude || 0.15),
            background: options.background || 0x000000,
            opacity: options.opacity || 1,
            seed: Math.random() * 1000,
            detail: this.isAndroid ? 1 : (options.detail || 3),
            density: this.isAndroid ? 1 : (options.density || 2),
            frequency: this.isAndroid ? 0.2 : (options.frequency || 0.4)
        };

        // Enhanced renderer optimizations
        this.renderer = new THREE.WebGLRenderer({
            antialias: false, // Disable antialiasing completely
            powerPreference: "low-power",
            precision: "lowp", // Always use low precision
            alpha: true,
            stencil: false,
            depth: false // Disable depth testing since we only have one object
        });

        this.renderer.setPixelRatio(1); // Force 1:1 pixel ratio
        this.renderer.setSize(this.options.size.width, this.options.size.height);
        
        // Enable automatic garbage collection
        this.renderer.info.autoReset = true;
        
        // Memory management
        this.dispose = () => {
            if (this.geometry) this.geometry.dispose();
            if (this.material) this.material.dispose();
            if (this.renderer) this.renderer.dispose();
            this.container.innerHTML = '';
        };

        this.init();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, this.options.size.width / this.options.size.height, 0.1, 1000);
        this.camera.position.z = 3;

        // Create renderer
        this.renderer.setSize(this.options.size.width, this.options.size.height);
        this.renderer.setClearColor(0x000000, 0); // Set alpha to 0 for full transparency
        this.container.appendChild(this.renderer.domElement);

        // Create blob
        this.createBlob();

        // Start animation
        this.animate();
    }

    createBlob() {
        // Minimal geometry settings
        const segments = this.isAndroid ? 16 : 24; // Further reduced segments
        const geometry = new THREE.SphereGeometry(1, segments, segments);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: this.options.color },
                seed: { value: this.options.seed }
            },
            vertexShader: `
                uniform float time;
                uniform float seed;
                varying vec3 vNormal;
                
                void main() {
                    vNormal = normal;
                    vec3 pos = position;
                    float noise = sin(time + position.y * 2.0) * ${this.options.amplitude};
                    pos += normal * noise;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                varying vec3 vNormal;
                
                void main() {
                    float light = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
                    gl_FragColor = vec4(color * light, 1.0);
                }
            `,
            transparent: true
        });

        // Enable shader code optimization
        material.extensions = {
            derivatives: false,
            fragDepth: false,
            drawBuffers: false,
            shaderTextureLOD: false
        };

        this.blob = new THREE.Mesh(geometry, material);
        this.scene.add(this.blob);

        // Force garbage collection
        if (typeof window.gc === 'function') {
            window.gc();
        }
    }

    animate() {
        const animate = (time) => {
            requestAnimationFrame(animate);
            time *= 0.001 * this.options.speed;
            this.blob.material.uniforms.time.value = time;
            
            // Reduce rotation calculations
            this.blob.rotation.y = time * 0.2;
            
            this.renderer.render(this.scene, this.camera);
        };

        animate(0);
    }

    // Clean up resources
    dispose() {
        this.blob.geometry.dispose();
        this.blob.material.dispose();
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }

    // Add cleanup method
    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
            this.geometry.dispose();
            this.material.dispose();
        }
    }
}
