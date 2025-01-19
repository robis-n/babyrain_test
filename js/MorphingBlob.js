class MorphingBlob {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }

        // Only apply mobile optimizations for Android
        this.isAndroid = /Android/i.test(navigator.userAgent);
        
        // Base configuration
        this.options = {
            size: options.size || { width: 300, height: 300 },
            color: options.color || new THREE.Color(0.8, 0.7, 0.7),
            speed: this.isAndroid ? 0.5 : 1,
            amplitude: this.isAndroid ? 0.05 : (options.amplitude || 0.15),
            background: options.background || 0x000000,
            opacity: options.opacity || 1,
            seed: Math.random() * 1000,
            detail: this.isAndroid ? 1 : (options.detail || 3),
            segments: this.isAndroid ? 12 : 64
        };

        // Renderer settings
        this.renderer = new THREE.WebGLRenderer({
            antialias: !this.isAndroid,
            alpha: true,
            powerPreference: this.isAndroid ? "low-power" : "high-performance",
            precision: this.isAndroid ? "lowp" : "highp"
        });

        this.renderer.setPixelRatio(this.isAndroid ? 1 : window.devicePixelRatio);
        this.renderer.setSize(this.options.size.width, this.options.size.height);
        
        // Memory management
        this.dispose = () => {
            if (this.geometry) this.geometry.dispose();
            if (this.material) this.material.dispose();
            if (this.renderer) this.renderer.dispose();
            this.container.innerHTML = '';
        };

        this.isDisposed = false;
        this.isInitialized = false;
        this.animationFrameId = null;
        this.contextLost = false;

        // Bind methods to preserve 'this' context
        this.handleContextLost = this.handleContextLost.bind(this);
        this.handleContextRestored = this.handleContextRestored.bind(this);
        this.animate = this.animate.bind(this);
        this.dispose = this.dispose.bind(this);

        // Add error handling for context creation
        try {
            this.init();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize WebGL context:', error);
            this.createFallbackBlob();
        }
    }

    init() {
        try {
            // Test WebGL capabilities
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                throw new Error('WebGL not supported');
            }

            // Create scene with reduced complexity for Android
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(75, this.options.size.width / this.options.size.height, 0.1, 1000);
            this.camera.position.z = 3;

            this.renderer = new THREE.WebGLRenderer({
                antialias: false,
                alpha: true,
                powerPreference: "low-power",
                precision: this.isAndroid ? "lowp" : "mediump"
            });

            this.renderer.setSize(this.options.size.width, this.options.size.height);
            this.renderer.setClearColor(0x000000, 0);
            this.container.appendChild(this.renderer.domElement);

            // Add context loss event listeners
            this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost, false);
            this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored, false);

            this.createBlob();
            this.addLights();
            this.animate();
        } catch (error) {
            console.error('WebGL initialization failed:', error);
            this.createFallbackBlob();
        }
    }

    handleContextLost(event) {
        event.preventDefault();
        this.contextLost = true;
        this.stopAnimation();
        console.log('WebGL context lost');
    }

    handleContextRestored() {
        this.contextLost = false;
        console.log('WebGL context restored');
        this.reinitialize();
    }

    pauseAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    restoreContext() {
        if (this.isDisposed) return;
        
        // Recreate WebGL resources
        this.createBlob();
        this.addLights();
        this.animate();
    }

    createBlob() {
        const segments = this.isAndroid ? this.options.segments : 64;
        const geometry = new THREE.SphereGeometry(1, segments, segments);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: this.options.color },
                seed: { value: this.options.seed } // Pass the seed to the shader
            },
            vertexShader: `
                uniform float time;
                uniform float seed;
                varying vec2 vUv;
                varying vec3 vNormal;
                
                void main() {
                    vUv = uv;
                    vNormal = normal;
                    
                    vec3 pos = position;
                    float noise = sin(time * 2.0 + position.y * 4.0 + seed) * ${this.options.amplitude};
                    noise += sin(time * 3.0 + position.x * 5.0 + seed) * ${this.options.amplitude};
                    pos += normal * noise;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color;
                varying vec2 vUv;
                varying vec3 vNormal;
                
                void main() {
                    vec3 baseColor = color;
                    vec3 rainbow = vec3(
                        sin(time + vUv.x * 6.28) * 0.5 + 0.5,
                        sin(time * 1.2 + vUv.x * 6.28) * 0.5 + 0.5,
                        sin(time * 1.4 + vUv.x * 6.28) * 0.5 + 0.5
                    );
                    
                    float light = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))) * 0.5 + 0.5;
                    vec3 finalColor = mix(baseColor, rainbow, 0.5) * light;
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            transparent: true
        });

        this.blob = new THREE.Mesh(geometry, material);
        this.scene.add(this.blob);
    }

    createFallbackBlob() {
        // Create a CSS-based fallback
        const fallback = document.createElement('div');
        fallback.style.width = '100%';
        fallback.style.height = '100%';
        fallback.style.background = `radial-gradient(circle at 30% 30%, 
            rgba(${this.options.color.r * 255}, ${this.options.color.g * 255}, ${this.options.color.b * 255}, 0.8),
            rgba(${this.options.color.r * 255}, ${this.options.color.g * 255}, ${this.options.color.b * 255}, 0.3))`;
        fallback.style.borderRadius = '50%';
        fallback.style.animation = 'pulse 4s infinite';
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
        
        this.container.innerHTML = '';
        this.container.appendChild(fallback);
    }

    addLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(5, 5, 5);
        this.scene.add(pointLight);
    }

    animate() {
        if (this.isDisposed || this.contextLost) return;

        this.animationFrameId = requestAnimationFrame(this.animate);
        
        const time = performance.now() * 0.001 * this.options.speed;
        
        if (this.blob && this.blob.material && !this.contextLost) {
            try {
                this.blob.material.uniforms.time.value = time;
                this.blob.rotation.x = time * 0.3;
                this.blob.rotation.y = time * 0.5;
                
                if (this.renderer && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            } catch (error) {
                console.error('Animation error:', error);
                this.stopAnimation();
                this.createFallbackBlob();
            }
        }
    }

    stopAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    reinitialize() {
        if (this.isDisposed) return;

        try {
            // Recreate WebGL resources
            this.createBlob();
            this.addLights();
            this.animate();
        } catch (error) {
            console.error('Failed to restore context:', error);
            this.createFallbackBlob();
        }
    }

    // Clean up resources
    dispose() {
        this.isDisposed = true;
        this.stopAnimation();

        if (this.renderer && this.renderer.domElement) {
            this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
            this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
        }

        if (this.blob) {
            if (this.blob.geometry) this.blob.geometry.dispose();
            if (this.blob.material) this.blob.material.dispose();
            if (this.scene) this.scene.remove(this.blob);
        }

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        // Clear references
        this.blob = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.contextLost = false;

        if (this.container) {
            this.container.innerHTML = '';
        }
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
