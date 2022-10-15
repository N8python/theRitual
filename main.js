import * as THREE from 'https://cdn.skypack.dev/three@0.142.0';
import { EffectComposer } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/SMAAPass.js';
import { GammaCorrectionShader } from 'https://unpkg.com/three@0.142.0/examples/jsm/shaders/GammaCorrectionShader.js';
import { HorizontalBlurShader } from 'https://unpkg.com/three@0.142.0/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'https://unpkg.com/three@0.142.0/examples/jsm/shaders/VerticalBlurShader.js';
import { EffectShader } from "./EffectShader.js";
import { OrbitControls } from 'https://unpkg.com/three@0.142.0/examples/jsm/controls/OrbitControls.js';
import { MeshSurfaceSampler } from 'https://unpkg.com/three@0.142.0/examples/jsm/math/MeshSurfaceSampler.js';
import { FBXLoader } from 'https://unpkg.com/three@0.142.0/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'https://unpkg.com/three@0.142.0/examples/jsm/utils/SkeletonUtils.js';
import { BloomShader } from './BloomShader.js';
import { BloomAddShader } from './BloomAddShader.js';
import { AssetManager } from './AssetManager.js';
import { Stats } from "./stats.js";
import { ShadowMesh } from "./ShadowMesh.js";
import { StaticGeometryGenerator } from "./StaticGeometryGenerator.js";
async function main() {
    // Setup basic renderer, controls, and profiler
    const clientWidth = window.innerWidth * 0.99;
    const clientHeight = window.innerHeight * 0.98;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 1000);
    camera.position.set(25, 125, 25);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(clientWidth, clientHeight);
    document.body.appendChild(renderer.domElement);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    /*const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);*/
    camera.lookAt(0, 0, 0);
    const stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
    // Setup scene
    // Skybox
    const environment = new THREE.CubeTextureLoader().load([
        "skybox/Box_Right.bmp",
        "skybox/Box_Left.bmp",
        "skybox/Box_Top.bmp",
        "skybox/Box_Bottom.bmp",
        "skybox/Box_Front.bmp",
        "skybox/Box_Back.bmp"
    ]);
    environment.encoding = THREE.sRGBEncoding;
    //scene.background = environment;
    // Lighting
    const ambientLight = new THREE.AmbientLight(new THREE.Color(1.0, 1.0, 1.0), 0.0);
    scene.add(ambientLight);
    // Objects
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000).applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2)), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, dithering: true }));
    ground.castShadow = true;
    ground.receiveShadow = true;
    scene.add(ground);
    const box = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: new THREE.Color(1.0, 0.0, 0.0) }));
    box.castShadow = true;
    box.receiveShadow = true;
    box.position.y = 5.01;
    //scene.add(box);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(6.25, 32, 32), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, envMap: environment, metalness: 1.0, roughness: 0.25 }));
    sphere.position.y = 7.5;
    sphere.position.x = 25;
    sphere.position.z = 25;
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    //scene.add(sphere);
    const torusKnot = new THREE.Mesh(new THREE.TorusKnotGeometry(5, 1.5, 200, 32), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, envMap: environment, metalness: 0.5, roughness: 0.5, color: new THREE.Color(0.0, 1.0, 0.0) }));
    torusKnot.position.y = 10;
    torusKnot.position.x = -25;
    torusKnot.position.z = -25;
    torusKnot.castShadow = true;
    torusKnot.receiveShadow = true;
    // scene.add(torusKnot);
    // Build postprocessing stack
    // Render Targets
    const colors = [
        new THREE.Color(1, 0, 0),
        new THREE.Color(1, 1, 0),
        new THREE.Color(0, 1, 0),
        new THREE.Color(0, 1, 1),
        new THREE.Color(0, 0, 1),
        new THREE.Color(1, 0, 1)
    ];
    const lights = [];
    const walkers = [];
    const walkerDude = await new FBXLoader().loadAsync("Walking.fbx");
    const spellDude = await new FBXLoader().loadAsync("Casting Spell.fbx");
    const prayingDude = await new FBXLoader().loadAsync("Praying.fbx");
    const idleDude = await new FBXLoader().loadAsync("Breathing Idle.fbx");
    const pMat = new THREE.MeshMatcapMaterial({
        color: new THREE.Color(1.0, 1.0, 1.0),
    })
    const tempMixer = new THREE.AnimationMixer(prayingDude);
    const pray = tempMixer.clipAction(prayingDude.animations[0]);
    const idle = tempMixer.clipAction(idleDude.animations[1]);
    pray.play();
    tempMixer.update(0.0);
    prayingDude.updateMatrixWorld();
    prayingDude.updateWorldMatrix();
    prayingDude.updateMatrix();
    prayingDude.traverse(c => {
        if (c.isMesh) {
            c.material = pMat;
        }
    })
    const geo = new StaticGeometryGenerator(prayingDude).generate();
    const sampler = new MeshSurfaceSampler(new THREE.Mesh(geo))
        .build();
    const positions = [];
    const finalPositions = [];
    const pos = new THREE.Vector3();
    const norm = new THREE.Vector3();
    for (let i = 0; i < 100000 * colors.length; i++) {
        sampler.sample(pos, norm);
        finalPositions.push(pos.x + 0.25 * norm.x, pos.y + 0.25 * norm.y, pos.z + 0.25 * norm.z);
    }
    for (let i = 0; i < 100000; i++) {
        sampler.sample(pos, norm);
        positions.push(pos.x + 0.25 * norm.x, pos.y + 0.25 * norm.y, pos.z + 0.25 * norm.z);
    }
    const randomDirs = [];
    for (let i = 0; i < 100000 * colors.length; i++) {
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        dir.normalize();
        randomDirs.push(dir.x, dir.y, dir.z);
    }
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    //scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({})));
    walkerDude.scale.set(0.25, 0.25, 0.25);
    let mixers = [];
    // scene.add(walkerDude);
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI * 2 * (i / 6);
        const light = new THREE.PointLight(colors[i], 1, 50, 2);
        const sphereLight = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(colors[i].r, colors[i].g, colors[i].b), transparent: true, opacity: 1 }));
        // console.log(sphereLight.position);
        //sphereLight.position.copy(light.position);
        lights.push(sphereLight);
        //scene.add(light);
        sphereLight.add(light);
        const walker = SkeletonUtils.clone(walkerDude);
        walker.angle = angle;
        walker.position.set(300 * Math.sin(angle), 0, 300 * Math.cos(angle));
        walker.lookAt(0, 10, 0);
        walker.light = light;
        walker.orb = sphereLight;
        const wMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(1, 1, 1)
        })
        walker.traverse(c => {
            if (c.isMesh) {
                c.castShadow = true;
                c.material = wMat;
            }
        })
        scene.add(walker);
        light.castShadow = true;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 25;
        light.shadow.bias = -0.005;
        // scene.add(new THREE.CameraHelper(light.shadow.camera));
        let toAdd = null;
        walker.traverse(c => {
            if (c.name === "mixamorigRightHandMiddle4" && !toAdd) {
                //c.add(light);
                toAdd = c;
            }
        })
        sphereLight.position.x -= 4.0;
        toAdd.add(sphereLight);
        const mixer = new THREE.AnimationMixer(walker);
        const walk = mixer.clipAction(walkerDude.animations[0]);
        const spell = mixer.clipAction(spellDude.animations[0]);
        const pray = mixer.clipAction(prayingDude.animations[0]);
        walker.walk = walk;
        walker.spell = spell;
        walker.pray = pray;
        walker.mixer = mixer;
        walk.play();
        //spell.play();
        walkers.push(walker);
        mixers.push(mixer);
        walker.time = -1.0 * i;
    }
    const defaultTexture = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter
    });
    defaultTexture.depthTexture = new THREE.DepthTexture(clientWidth, clientHeight, THREE.UnsignedInt248Type);
    defaultTexture.depthTexture.format = THREE.DepthStencilFormat;
    const bloomTexture = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter
    });
    bloomTexture.depthTexture = new THREE.DepthTexture(clientWidth, clientHeight, THREE.FloatType);
    // Post Effects
    const composer = new EffectComposer(renderer);
    const smaaPass = new SMAAPass(clientWidth, clientHeight);
    const effectPass = new ShaderPass(EffectShader);
    const bloomPass = new ShaderPass(BloomShader);
    const bloomAddPass = new ShaderPass(BloomAddShader);
    const hblur = new ShaderPass(HorizontalBlurShader);
    const vblur = new ShaderPass(VerticalBlurShader);
    hblur.uniforms.h.value = 4.0 / clientWidth;
    vblur.uniforms.v.value = 4.0 / clientHeight;
    const hblur2 = new ShaderPass(HorizontalBlurShader);
    const vblur2 = new ShaderPass(VerticalBlurShader);
    hblur2.uniforms.h.value = 2.0 / clientWidth;
    vblur2.uniforms.v.value = 2.0 / clientHeight;
    composer.addPass(bloomPass);
    composer.addPass(hblur);
    composer.addPass(vblur);
    composer.addPass(hblur2);
    composer.addPass(vblur2);
    composer.addPass(bloomAddPass);
    composer.addPass(new ShaderPass(GammaCorrectionShader));
    composer.addPass(new ShaderPass({

        uniforms: {

            'tDiffuse': { value: null }
        },

        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }`,

        fragmentShader: /* glsl */ `
            uniform sampler2D tDiffuse;
            varying vec2 vUv;
            #include <common>
            #define DITHERING
            #include <dithering_pars_fragment>
            void main() {
                vec4 diffuse = texture2D(tDiffuse, vUv);
                gl_FragColor = vec4(clamp(diffuse.rgb, 0.0, 1.0), 1.0);
                #include <dithering_fragment>
            }`

    }))
    composer.addPass(smaaPass);
    const clock = new THREE.Clock();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.0);
    let theFirstOrb;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 1000, 32).translate(0, 500, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1), transparent: true, opacity: 1.0 }));
    beam.scale.y = 0;
    beam.visible = false;
    scene.add(beam);
    camera.target = new THREE.Vector3();
    let finishTime;
    let exploded = false;
    let doExplode = false;

    function animate() {
        const delta = Math.min(clock.getDelta(), 0.05);
        mixers.forEach(mixer => {
            mixer.update(delta);
        });
        if (walkers.every(walker => walker.done)) {
            if (!finishTime) {
                finishTime = performance.now();
            }
            beam.scale.x *= 1.05;
            beam.scale.z *= 1.05;
            beam.material.opacity *= 0.9;
            beam.material.depthWrite = false;
            beam.scale.y *= 0.9;
        }
        walkers.forEach((walker, i) => {
            walker.time += delta;
            if (walker.time > 0) {
                if (walker.position.length() > 50) {
                    walker.position.add(walker.position.clone().multiplyScalar(-1).normalize().multiplyScalar(50.0 * delta));
                } else {
                    if (!walker.casting && !walker.praying) {
                        //walker.walk.stop(); //fadeOut(0.25);
                        walker.walk.fadeOut(0.5); //fadeIn(0.25);
                        walker.spell.enabled = true;
                        walker.spell.reset();
                        walker.spell.fadeIn(0.5);
                        walker.spell.play();
                        walker.casting = true;
                    }
                }
                if (walker.casting) {
                    if (!walker.castingTime) {
                        walker.castingTime = 0;
                    }
                    walker.castingTime += delta;
                    if (walker.castingTime > 6 && !walker.orb.free) {
                        scene.attach(walker.orb);
                        walker.orb.free = true;
                        walker.orb.life = 0;
                        if (!theFirstOrb) {
                            theFirstOrb = performance.now();
                        }
                        walker.spell.fadeOut(0.5); //fadeIn(0.25);
                        walker.pray.enabled = true;
                        walker.pray.reset();
                        walker.pray.fadeIn(0.5);
                        walker.pray.play();
                        walker.praying = true;
                        walker.casting = false;
                    }
                }
                if (walker.praying) {
                    if (!walker.prayingTime) {
                        walker.prayingTime = 0;
                    }
                    walker.prayingTime += delta;
                    if (walker.prayingTime > 7.5 && !walker.ascended) {
                        walker.ascended = true;
                        walker.mixer.timeScale = 0.0;
                        /* const walkerGeo = new StaticGeometryGenerator(walker).generate();
                         const sampler = new MeshSurfaceSampler(new THREE.Mesh(walkerGeo))
                             .build();
                         const positions = [];
                         const pos = new THREE.Vector3();
                         const norm = new THREE.Vector3();
                         for (let i = 0; i < 100000; i++) {
                             sampler.sample(pos, norm);
                             positions.push(pos.x + 0.25 * norm.x, pos.y + 0.25 * norm.y, pos.z + 0.25 * norm.z);
                         }
                         const pointsGeo = new THREE.BufferGeometry();
                         pointsGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));*/
                        walker.pointsMat = new THREE.ShaderMaterial({
                            transparent: true,
                            uniforms: {
                                time: { value: -2.0 },
                                yeet: { value: false },
                                yeetCenter: { value: new THREE.Vector3() },
                                color: { value: new THREE.Vector3(walker.light.color.r, walker.light.color.g, walker.light.color.b) }
                            },
                            vertexShader: /*glsl*/ `
                            varying vec3 vWorldPosition;
                            varying float bias;
                            attribute vec3 position2;
                            attribute vec3 randomDir;
                            uniform float time;
                            uniform vec3 yeetCenter;
                            uniform bool yeet;
                            vec3 random3(vec3 c) {
                                float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
                                vec3 r;
                                r.z = fract(512.0*j);
                                j *= .125;
                                r.x = fract(512.0*j);
                                j *= .125;
                                r.y = fract(512.0*j);
                                return r-0.5;
                            }
                            
                            const float F3 =  0.3333333;
                            const float G3 =  0.1666667;
                            float snoise(vec3 p) {
                            
                                vec3 s = floor(p + dot(p, vec3(F3)));
                                vec3 x = p - s + dot(s, vec3(G3));
                                 
                                vec3 e = step(vec3(0.0), x - x.yzx);
                                vec3 i1 = e*(1.0 - e.zxy);
                                vec3 i2 = 1.0 - e.zxy*(1.0 - e);
                                     
                                vec3 x1 = x - i1 + G3;
                                vec3 x2 = x - i2 + 2.0*G3;
                                vec3 x3 = x - 1.0 + 3.0*G3;
                                 
                                vec4 w, d;
                                 
                                w.x = dot(x, x);
                                w.y = dot(x1, x1);
                                w.z = dot(x2, x2);
                                w.w = dot(x3, x3);
                                 
                                w = max(0.6 - w, 0.0);
                                 
                                d.x = dot(random3(s), x);
                                d.y = dot(random3(s + i1), x1);
                                d.z = dot(random3(s + i2), x2);
                                d.w = dot(random3(s + 1.0), x3);
                                 
                                w *= w;
                                w *= w;
                                d *= w;
                                 
                                return dot(d, vec4(52.0));
                            }
                            float rand(vec2 n) { 
                                return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
                            }
                            void main() {
                                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                                vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                                bias = -vWorldPosition.y + time * 10.0 + snoise(vWorldPosition) * 10.0; //snoise(vWorldPosition);
                                mvPosition = modelViewMatrix * vec4(mix(position, position2, smoothstep(0.0, 1.0, clamp((bias - 100.0) * 0.1, 0.0, 1.0))), 1.0);
                                if (yeet) {
                                    vec3 startPos = position2;
                                    vec3 initialDir = mix(normalize(position2 - yeetCenter), randomDir, 0.5);
                                    vec3 gravity = vec3(0, -9.8, 0);
                                    vec3 finalPos = startPos + 100.0 * initialDir * time + 0.5 * gravity * time * time;
                                    if (finalPos.y < 0.0) {
                                        bias = smoothstep(0.0, 1.0, clamp(1.0 + 0.033 * finalPos.y, 0.0, 1.0));
                                        finalPos.y = 0.0;
                                    }
                                    mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
                                }
                                gl_PointSize = ((${clientHeight * 0.2}) / - mvPosition.z ) + rand(mvPosition.xy);
                                gl_Position = projectionMatrix * mvPosition;
                            }
                            `,
                            fragmentShader: /*glsl*/ `
                            varying vec3 vWorldPosition;
                            varying float bias;
                            uniform vec3 color;
                            uniform float time;
                            uniform bool yeet;
                            void main() {
                                float alpha = clamp(bias, 0.0, 1.0);
                                if (alpha < 0.05) {
                                    discard;
                                }
                                gl_FragColor = vec4(yeet ? vec3(1.0) : color, alpha);
                            }
                            `
                        });
                        const newGeo = pointsGeo.clone().applyMatrix4(walker.matrixWorld);
                        newGeo.computeBoundingBox();
                        walker.maxY = newGeo.boundingBox.max.y;
                        newGeo.setAttribute("position2", new THREE.BufferAttribute(new Float32Array(finalPositions.slice(i * 300000, ((i + 1) * 300000))), 3));
                        newGeo.setAttribute("randomDir", new THREE.BufferAttribute(new Float32Array(randomDirs.slice(i * 300000, ((i + 1) * 300000))), 3));
                        const walkerPoints = new THREE.Points(newGeo, walker.pointsMat);
                        scene.add(walkerPoints);
                        lights.push(walkerPoints);
                    }
                    if (walker.ascended) {
                        walker.pray.time *= 0.9;
                        walker.pointsMat.uniforms.time.value += delta;
                        if (walkers.every(walker => walker.done)) {
                            const timeInterval = 250 * Math.exp(-0.0001 * (performance.now() - finishTime));
                            if (timeInterval < 100) {
                                doExplode = true;
                            }
                            const intensity = 0.5 + 0.5 * Math.sin((performance.now() - finishTime) / (timeInterval));
                            walker.pointsMat.uniforms.color.value.x = intensity;
                            walker.pointsMat.uniforms.color.value.y = intensity;
                            walker.pointsMat.uniforms.color.value.z = intensity;
                        }
                        if (-walker.maxY + 10.0 * walker.pointsMat.uniforms.time.value > 10.0) {
                            walker.visible = false;
                        }
                        if (-walker.maxY + 10.0 * walker.pointsMat.uniforms.time.value > 110.0) {
                            walker.done = true;
                        }
                    }
                }
                if (walker.orb.free) {
                    walker.orb.life += delta;
                    const scale = Math.max((1000 * Math.exp(-0.0001 * (performance.now() - theFirstOrb))), 100);
                    walker.orb.position.lerp(new THREE.Vector3(10 * Math.sin(performance.now() / scale + walker.angle), 25, 10 * Math.cos(performance.now() / scale + walker.angle)), 0.1);
                }
            }
        });
        if (doExplode && !exploded) {
            exploded = true;
            scene.add(prayingDude);
            lights.push(prayingDude);
            walkers.forEach(walker => {
                walker.pointsMat.uniforms.yeet.value = true;
                walker.pointsMat.uniforms.yeetCenter.value = (new THREE.Box3()).setFromObject(prayingDude).getCenter(new THREE.Vector3());
                walker.pointsMat.uniforms.time.value = 0;
            })
            pray.fadeOut(0.5); //fadeIn(0.25);
            idle.enabled = true;
            idle.reset();
            idle.fadeIn(0.5);
            idle.play();
        }
        if (exploded) {
            tempMixer.update(delta);
        }
        if ((performance.now() - theFirstOrb) > 13000) {
            camera.position.lerp(new THREE.Vector3(150 * Math.sin(performance.now() / 2500), 225, 150 * Math.cos(performance.now() / 2500)), 0.01);
            camera.target.lerp(new THREE.Vector3(0, 75, 0), 0.01);
            camera.lookAt(camera.target);
        } else if ((performance.now() - theFirstOrb) > 6000) {
            if (beam.scale.y === 0) {
                beam.scale.y = 0.01;
                beam.visible = true;
            } else {
                beam.scale.y = Math.min(beam.scale.y * 1.1, 1);
                walkers.forEach(walker => {
                    walker.orb.scale.multiplyScalar(1.05);
                    walker.orb.material.opacity *= 0.925;
                    walker.orb.material.depthWrite = false;
                })
            }
            camera.position.lerp(new THREE.Vector3(150 * Math.sin(performance.now() / 2500), 125, 150 * Math.cos(performance.now() / 2500)), 0.01);
            camera.lookAt(0, 0, 0);
            if (!camera.target) {
                camera.target = new THREE.Vector3();
            }
        }
        renderer.setRenderTarget(defaultTexture);
        renderer.clear();
        renderer.render(scene, camera);
        renderer.setRenderTarget(bloomTexture);
        renderer.clear();
        renderer.autoClear = false;
        lights.forEach(light => {
            //light.updateMatrixWorld();
            const oldParent = light.parent;
            scene.attach(light);
            renderer.render(light, camera);
            oldParent.attach(light);
        });
        renderer.render(beam, camera);
        renderer.autoClear = true;
        bloomPass.uniforms["sceneDiffuse"].value = defaultTexture.texture;
        bloomPass.uniforms["sceneDepth"].value = defaultTexture.depthTexture;
        bloomPass.uniforms["bloomDiffuse"].value = bloomTexture.texture;
        bloomPass.uniforms["bloomDepth"].value = bloomTexture.depthTexture;
        bloomAddPass.uniforms["sceneDiffuse"].value = defaultTexture.texture;
        bloomAddPass.uniforms["bloomAmt"].value = 1.0;
        composer.render();
        //controls.update();
        stats.update();
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}
main();