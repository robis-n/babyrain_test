class MorphingBlob {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }

        // Default options
        this.options = {
            size: options.size || { width: 300, height: 300 },
            color: options.color || new THREE.Color(0.8, 0.7, 0.7),
            speed: options.speed || 1,
            amplitude: options.amplitude || 0.15,
            background: options.background || 0x000000,
            opacity: options.opacity || 1,
            seed: Math.random() * 1000 // Add a random seed for each blob
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
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true 
        });
        this.renderer.setSize(this.options.size.width, this.options.size.height);
        this.renderer.setClearColor(0x000000, 0); // Set alpha to 0 for full transparency
        this.container.appendChild(this.renderer.domElement);

        // Create blob
        this.createBlob();
        
        // Add lights
        this.addLights();

        // Start animation
        this.animate();
    }

    createBlob() {
        const geometry = new THREE.SphereGeometry(1, 64, 64);
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

    addLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(5, 5, 5);
        this.scene.add(pointLight);
    }

    animate() {
        const animate = (time) => {
            requestAnimationFrame(animate);
            
            time *= 0.001 * this.options.speed;
            this.blob.material.uniforms.time.value = time;
            
            this.blob.rotation.x = time * 0.3;
            this.blob.rotation.y = time * 0.5;
            
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
}
