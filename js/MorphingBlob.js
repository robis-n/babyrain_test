class MorphingBlob {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }

        // Specific Android detection
        this.isAndroid = /Android/i.test(navigator.userAgent);
        
        // Enhanced mobile detection
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isLowEnd = this.isMobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
        
        // Base configuration with reduced complexity
        this.options = {
            size: options.size || { 
                width: this.isMobile ? window.innerWidth * 0.8 : 300,
                height: this.isMobile ? window.innerWidth * 0.8 : 300
            },
            color: options.color || new THREE.Color(0.8, 0.7, 0.7),
            speed: this.isLowEnd ? 0.3 : (options.speed || 1),
            amplitude: this.isLowEnd ? 0.03 : (options.amplitude || 0.15),
            background: options.background || 0x000000,
            opacity: options.opacity || 1,
            seed: Math.random() * 1000,
            detail: this.isAndroid ? 1 : (options.detail || 3),
            density: this.isAndroid ? 1 : (options.density || 2),
            frequency: this.isAndroid ? 0.2 : (options.frequency || 0.4)
        };

        // Mobile-optimized renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: false, // Disable antialiasing completely
            powerPreference: "low-power",
            precision: this.isLowEnd ? "lowp" : "mediump", // Always use low precision
            alpha: true,
            stencil: false,
            depth: false, // Disable depth testing since we only have one object
            failIfMajorPerformanceCaveat: false // Allow software rendering fallback
        });

        // Force lower resolution on mobile
        const pixelRatio = this.isLowEnd ? 0.75 : 1;
        this.renderer.setPixelRatio(pixelRatio);
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
        this.camera = new THREE.PerspectiveCamera(
            this.isMobile ? 60 : 75,
            this.options.size.width / this.options.size.height,
            0.1,
            1000
        );
        this.camera.position.z = this.isMobile ? 4 : 3;

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
        const segments = this.isLowEnd ? 12 : 24; // Further reduced segments
        const geometry = new THREE.SphereGeometry(1, segments, segments);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: this.options.color },
                seed: { value: this.options.seed }
            },
            vertexShader: `
                #ifdef GL_ES
                precision ${this.isLowEnd ? 'lowp' : 'mediump'} float;
                #endif
                
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
            
            // Reduce animation complexity on mobile
            if (!this.isLowEnd || document.hasFocus()) {
                time *= 0.001 * this.options.speed;
                this.blob.material.uniforms.time.value = time;
                this.blob.rotation.y = time * 0.2;
                this.renderer.render(this.scene, this.camera);
            }
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
