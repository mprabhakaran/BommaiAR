import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';
import {OrbitControls} from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls.js'
import {GLTFLoader} from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/GLTFLoader.js'
import {VRButton} from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/webxr/VRButton.js'
import {ARButton} from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/webxr/ARButton.js'

let vinthai;
let mixer = null;

let hitTestSourceRequested = false;
let hitTestSource = null;

//scene
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);
camera.position.set(0,0,3);

//renderer
const renderer = new THREE.WebGLRenderer({
    antialias:true,
    alpha:true
})
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
document.body.appendChild(renderer.domElement);
renderer.xr.enabled = true;

//ARButton
document.body.appendChild(ARButton.createButton(renderer,{
    requiredFeatures:['hit-test'],  
}
));

//light
const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
directionalLight.position.set(0,0.3,0.5);
scene.add( directionalLight );


//XRcontroller
const controller = renderer.xr.getController(0);
scene.add(controller);


const reticle = new THREE.Mesh(
    new THREE.RingGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
    new THREE.MeshBasicMaterial()
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add( reticle );

//GLTF loader
const loader = new GLTFLoader();
loader.load('./scarecrow.glb',(glb)=>{
    vinthai = glb.scene;
    mixer = new THREE.AnimationMixer(glb.scene);
    const action = mixer.clipAction(glb.animations[0]);
    action.play();

})

controller.addEventListener('select',onSelect);

function onSelect(){
    if(reticle.visible){
        if(vinthai){
            vinthai.position.setFromMatrixPosition(reticle.matrix);
            vinthai.scale.set(0.5,0.5,0.5);
            scene.add(vinthai);
        }
    }
}

//Animation loop
renderer.setAnimationLoop(animate);

const clock = new THREE.Clock();

var previousTime = 0;

function animate(timestamp,frame){

    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;

    if(mixer !== null){
        mixer.update(deltaTime);
    }
    

    if ( frame ) {

        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if ( hitTestSourceRequested === false ) {

            session.requestReferenceSpace( 'viewer' ).then( function ( referenceSpace ) {

                session.requestHitTestSource( { space: referenceSpace } ).then( function ( source ) {

                    hitTestSource = source;

                } );

            } );

            session.addEventListener( 'end', function () {

                hitTestSourceRequested = false;
                hitTestSource = null;

            } );

            hitTestSourceRequested = true;

        }

        if ( hitTestSource ) {

            const hitTestResults = frame.getHitTestResults( hitTestSource );

            if ( hitTestResults.length ) {

                const hit = hitTestResults[ 0 ];

                reticle.visible = true;
                reticle.matrix.fromArray( hit.getPose( referenceSpace ).transform.matrix );
                

            } else {

                reticle.visible = false;
                
            }

        }

    }

    renderer.render(scene,camera);
}
