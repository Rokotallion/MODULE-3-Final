import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { GLTFLoader } from './GLTFLoader.js';

function RoundEdgedBox(w, h, d, r, wSegs, hSegs, dSegs, rSegs) {
  
    w = w || 1;
    h = h || 1;
    d = d || 1;
    let minimum = Math.min(Math.min(w, h), d);
    r = r || minimum * .25;
    r = r > minimum * .5 ? minimum * .5 : r;
    wSegs = Math.floor(wSegs) || 1;
    hSegs = Math.floor(hSegs) || 1;
    dSegs = Math.floor(dSegs) || 1;
    rSegs = Math.floor(rSegs) || 1;

    let fullGeometry = new THREE.BufferGeometry();

    let fullPosition = [];
    let fullUvs = [];
    let fullIndex = [];
    let fullIndexStart = 0;
    
    let groupStart = 0;

    bendedPlane(w, h, r, wSegs, hSegs, rSegs, d * .5, 'y', 0, 0);
    bendedPlane(w, h, r, wSegs, hSegs, rSegs, d * .5, 'y', Math.PI, 1);
    bendedPlane(d, h, r, dSegs, hSegs, rSegs, w * .5, 'y', Math.PI * .5, 2);
    bendedPlane(d, h, r, dSegs, hSegs, rSegs, w * .5, 'y', Math.PI * -.5, 3);
    bendedPlane(w, d, r, wSegs, dSegs, rSegs, h * .5, 'x', Math.PI * -.5, 4);
    bendedPlane(w, d, r, wSegs, dSegs, rSegs, h * .5, 'x', Math.PI * .5, 5);

    fullGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(fullPosition), 3));
    fullGeometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(fullUvs), 2));
    fullGeometry.setIndex(fullIndex);
    
    fullGeometry.computeVertexNormals();
    
    return fullGeometry;

    function bendedPlane(width, height, radius, widthSegments, heightSegments, smoothness, offset, axis, angle, materialIndex) {

      let halfWidth = width * .5;
      let halfHeight = height * .5;
      let widthChunk = width / (widthSegments + smoothness * 2);
      let heightChunk = height / (heightSegments + smoothness * 2);

      let planeGeom = new THREE.PlaneGeometry(width, height, widthSegments + smoothness * 2, heightSegments + smoothness * 2);

      let v = new THREE.Vector3(); // current vertex
      let cv = new THREE.Vector3(); // control vertex for bending
      let cd = new THREE.Vector3(); // vector for distance
      let position = planeGeom.attributes.position;
      let uv = planeGeom.attributes.uv;
      let widthShrinkLimit = widthChunk * smoothness;
      let widthShrinkRatio = radius / widthShrinkLimit;
      let heightShrinkLimit = heightChunk * smoothness;
      let heightShrinkRatio = radius / heightShrinkLimit;
      let widthInflateRatio = (halfWidth - radius) / (halfWidth - widthShrinkLimit);
      let heightInflateRatio = (halfHeight - radius) / (halfHeight - heightShrinkLimit);
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i);
        if (Math.abs(v.x) >= halfWidth - widthShrinkLimit) {
          v.setX((halfWidth - (halfWidth - Math.abs(v.x)) * widthShrinkRatio) * Math.sign(v.x));
        } else {
          v.x *= widthInflateRatio;
        }// lr
        if (Math.abs(v.y) >= halfHeight - heightShrinkLimit) {
          v.setY((halfHeight - (halfHeight - Math.abs(v.y)) * heightShrinkRatio) * Math.sign(v.y));
        } else {
          v.y *= heightInflateRatio;
        }// tb

        //re-calculation of uvs
        uv.setXY(
          i,
          (v.x - (-halfWidth)) / width,
          1 - (halfHeight - v.y) / height
        );


        // bending
        let widthExceeds = Math.abs(v.x) >= halfWidth - radius;
        let heightExceeds = Math.abs(v.y) >= halfHeight - radius;
        if (widthExceeds || heightExceeds) {
          cv.set(
            widthExceeds ? (halfWidth - radius) * Math.sign(v.x) : v.x,
            heightExceeds ? (halfHeight - radius) * Math.sign(v.y) : v.y, -radius);
          cd.subVectors(v, cv).normalize();
          v.copy(cv).addScaledVector(cd, radius);
        };

        position.setXYZ(i, v.x, v.y, v.z);
      }

      planeGeom.translate(0, 0, offset);
      switch (axis) {
        case 'y':
          planeGeom.rotateY(angle);
          break;
        case 'x':
          planeGeom.rotateX(angle);
      }

      // merge positions
      position.array.forEach(function(p){
        fullPosition.push(p);
      });
      
      // merge uvs
      uv.array.forEach(function(u){
        fullUvs.push(u);
      });
      
      // merge indices
      planeGeom.index.array.forEach(function(a) {
        fullIndex.push(a + fullIndexStart);
      });
      fullIndexStart += position.count;
            
      // set the groups
      fullGeometry.addGroup(groupStart, planeGeom.index.count, materialIndex);
      groupStart += planeGeom.index.count;
    }
}

let dirLight, textureCube, bridge, stand, sandLand, grassLand, cubeStone,
bushObj, rockStone, lampStand, treeBark, waterSand, water, waterTex, werehogMdl,
chipMdl, buildMdl1, buildMdl2, buildMdl3, fireflies, flyGeo;

let lampLight = [];
let lampObj = [];
let treeLeaves = [];

let lamps = 0;
let treeLCount = 0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const renderer = new THREE.WebGLRenderer({logarithmicDepthBuffer: true});

scene.background = new THREE.Color( 0x42242b );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const cubeLoader = new THREE.CubeTextureLoader();
cubeLoader.setPath('./assets/textures/');

const loader = new THREE.TextureLoader();
loader.setPath('./assets/textures/');

const gltfLoader = new GLTFLoader();

// Camera Control

const cameraControl = new OrbitControls(camera, renderer.domElement);

// *** Light Source ***
// Ambient

const ambLight = new THREE.AmbientLight( "#4f2c9c", 1 );
scene.add(ambLight);

// Function calls

const lightColor = "#eb7459";

dir(false);
bg();
bridgeGo();
standGo();
sandLandGo();
lampStandGo(2);
grassLandGo();
cubeStoneGo();
rockStoneGo(9);
bushObjGo(8);
waterSandGo();
waterGo();
treeBarkGo(2);
werehogMdlGo();
chipMdlGo();
buildMdl1Go();
buildMdl2Go();
buildMdl3Go();
firefliesGo();

// Pointlight

function dir(helper){
	dirLight = new THREE.DirectionalLight( lightColor, 2 );
	scene.add( dirLight );

	if (helper == true){
		const dirHelper = new THREE.DirectionalLightHelper( dirLight, 5 );
		scene.add( dirHelper );
	}
}

function bg(){
  textureCube = cubeLoader.load([
    'px2.png', 'nx2.png',
    'py2.png', 'ny4.png',
    'pz2.png', 'nz2.png'
  ]);

  textureCube.mapping = THREE.Cube;

  scene.background = textureCube;
}

function standGo(){
  const standGeom = new THREE.BoxGeometry(0.2, 1.7, 0.2);
  const standMatt = [new THREE.MeshLambertMaterial( {map: loader.load('SU_TexWoodDarker.png'), specular: lightColor} ),
  new THREE.MeshPhongMaterial( {map: loader.load('SU_TexWoodDarker.png'), specular: lightColor} ),
  new THREE.MeshPhongMaterial( {map: loader.load('SU_TexWoodTop.png'), specular: lightColor} ),
  new THREE.MeshPhongMaterial( {map: loader.load('SU_TexWoodTop.png'), specular: lightColor} ),
  new THREE.MeshPhongMaterial( {map: loader.load('SU_TexWoodDarker.png'), specular: lightColor} ),
  new THREE.MeshLambertMaterial( {map: loader.load('SU_TexWoodDarker.png'), specular: lightColor} ),];
  stand = [new THREE.Mesh( standGeom, standMatt ), new THREE.Mesh( standGeom, standMatt ),
  new THREE.Mesh( standGeom, standMatt ), new THREE.Mesh( standGeom, standMatt )]; 
  scene.add( stand[0] );
  scene.add( stand[1] );
  scene.add( stand[2] );
  scene.add( stand[3] );
}

function lampStandGo(num){
  const Geom = new THREE.TorusGeometry(1, 0.04, 5, 6, 1.8);
  const Matt = new THREE.MeshLambertMaterial({map: loader.load('SU_TexWood.png'), side: THREE.DoubleSide});
  lampStand = [];
  for (let i = 0; i < num; i++){
    lampStand.push(new THREE.Mesh(Geom, Matt));
    scene.add(lampStand[i]);
  }
}

function lampObjGo(color){
  lamps = lamps + 1;

  const Geom = new THREE.BoxGeometry(0.16, 0.41, 0.16);

  const RMatt = [new THREE.MeshBasicMaterial({map: loader.load('SU_LampOrange3.png')}),
  new THREE.MeshBasicMaterial({map: loader.load('SU_LampOrange3.png')}),
  new THREE.MeshBasicMaterial({map: loader.load('SU_TexWoodDarkerer.png')}),
  new THREE.MeshBasicMaterial({map: loader.load('SU_TexWoodDarkerer.png')}),
  new THREE.MeshBasicMaterial({map: loader.load('SU_LampOrange3.png')}),
  new THREE.MeshBasicMaterial({map: loader.load('SU_LampOrange3.png')})];

  const GMatt = [new THREE.MeshBasicMaterial({map: loader.load('SU_LampGreen3.png')}),
  new THREE.MeshBasicMaterial({map: loader.load('SU_LampGreen3.png')}),
  new THREE.MeshBasicMaterial({map: loader.load('SU_TexWoodDarkerer.png')}),
  new THREE.MeshBasicMaterial({map: loader.load('SU_TexWoodDarkerer.png')}),
  new THREE.MeshBasicMaterial({map: loader.load('SU_LampGreen3.png')}),
  new THREE.MeshBasicMaterial({map: loader.load('SU_LampGreen3.png')})];

  const BMatt = [new THREE.MeshBasicMaterial({map: loader.load('SU_LampBlue3.png')}),
  new THREE.MeshBasicMaterial({map: loader.load('SU_LampBlue3.png')}),
  new THREE.MeshBasicMaterial({map: loader.load('SU_TexWoodDarkerer.png')}),
  new THREE.MeshBasicMaterial({map: loader.load('SU_TexWoodDarkerer.png')}),
  new THREE.MeshBasicMaterial({map: loader.load('SU_LampBlue3.png')}),
  new THREE.MeshBasicMaterial({map: loader.load('SU_LampBlue3.png')})];

  switch (color){
    case "R":
      lampObj.push(new THREE.Mesh(Geom, RMatt));
      scene.add(lampObj[lamps-1]);
      break;
    case "r":
      lampObj.push(new THREE.Mesh(Geom, RMatt));
      scene.add(lampObj[lamps-1]);
      break;
    case "G":
      lampObj.push(new THREE.Mesh(Geom, GMatt));
      scene.add(lampObj[lamps-1]);
      break;
    case "g":
      lampObj.push(new THREE.Mesh(Geom, GMatt));
      scene.add(lampObj[lamps-1]);
      break;
    case "B":
      lampObj.push(new THREE.Mesh(Geom, BMatt));
      scene.add(lampObj[lamps-1]);
      break;
    case "b":
      lampObj.push(new THREE.Mesh(Geom, BMatt));
      scene.add(lampObj[lamps-1]);
      break;
  }

  lampLightGo(color, 1, 100);
}

function lampLightGo(color, intense, dist){

  const lightIntensity = intense; 
  const lightDistance = dist;

  switch (color){
    case "R":
      lampLight.push(new THREE.PointLight( '#edb787', lightIntensity, lightDistance));
      lampLight[lamps-1].position.set(0,0,0);
      scene.add(lampLight[lamps-1]);
      break;
    case "r":
      lampLight.push(new THREE.PointLight( '#edb787', lightIntensity, lightDistance));
      lampLight[lamps-1].position.set(0,0,0);
      scene.add(lampLight[lamps-1]);
      break;
    case "G":
      lampLight.push(new THREE.PointLight( '#87edb3', lightIntensity, lightDistance));
      lampLight[lamps-1].position.set(0,0,0);
      scene.add(lampLight[lamps-1]);
      break;
    case "g":
      lampLight.push(new THREE.PointLight( '#87edb3', lightIntensity, lightDistance));
      lampLight[lamps-1].position.set(0,0,0);
      scene.add(lampLight[lamps-1]);
      break;
    case "B":
      lampLight.push(new THREE.PointLight( '#81ddf0', lightIntensity, lightDistance));
      lampLight[lamps-1].position.set(0,0,0);
      scene.add(lampLight[lamps-1]);
      break;
    case "b":
      lampLight.push(new THREE.PointLight( '#81ddf0', lightIntensity, lightDistance));
      lampLight[lamps-1].position.set(0,0,0);
      scene.add(lampLight[lamps-1]);
      break;
  }
}

function bridgeGo(){
  const bridgeGeom = new THREE.BoxGeometry(1, 0.05, 1);
  const bridgeMatt = [new THREE.MeshPhongMaterial( {map: loader.load('SU_TexWoodDarker.png'), side: THREE.DoubleSide, specular: lightColor}),
  new THREE.MeshPhongMaterial( {map: loader.load('SU_TexWoodDarker.png'), side: THREE.DoubleSide, specular: lightColor}),
  new THREE.MeshPhongMaterial( {map: loader.load('SU_BridgeTexC.png'), side: THREE.DoubleSide, specular: lightColor, specularMap: loader.load('SU_BridgeSpecC.png'), bumpMap: loader.load('SU_BridgeTexBump1.png')}),
  new THREE.MeshPhongMaterial( {map: loader.load('SU_BridgeTexC.png'), side: THREE.DoubleSide, specular: lightColor, specularMap: loader.load('SU_BridgeSpecC.png'), bumpMap: loader.load('SU_BridgeTexBump1.png')}),
  new THREE.MeshPhongMaterial( {map: loader.load('SU_TexWoodDarker.png'), side: THREE.DoubleSide, specular: lightColor}),
  new THREE.MeshPhongMaterial( {map: loader.load('SU_TexWoodDarker.png'), side: THREE.DoubleSide, specular: lightColor})];
  bridge = [new THREE.Mesh( bridgeGeom, bridgeMatt ), new THREE.Mesh( bridgeGeom, bridgeMatt )]; 
  scene.add( bridge[0] );
  scene.add( bridge[1] );
}

function sandLandGo(){
  var texture = loader.load('SU_Sand.png', function ( texture ) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0,0);
    texture.repeat.set(4,4);
  })
  const Geom = new THREE.SphereGeometry(2, 20, 20);
  const Matt = new THREE.MeshLambertMaterial( {map: texture} );
  sandLand = [new THREE.Mesh(Geom, Matt)];
  scene.add(sandLand[0]);
}

function grassLandGo(){
  var texture = loader.load('SU_Grass.png', function ( texture ) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0,0);
    texture.repeat.set(4,4);
  })
  const Geom = new THREE.SphereGeometry(2, 20, 20);
  const Matt = new THREE.MeshLambertMaterial( {map: texture} );
  grassLand = [new THREE.Mesh(Geom, Matt)];
  scene.add(grassLand[0]);
}

function cubeStoneGo(){
  var texture = loader.load('SU_TexRockGrassLong.png', function ( texture ) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0,0);
    texture.repeat.set(4,1);
  })

  var spectexture = loader.load('SU_TexRockGrassLongSpec2.png', function ( texture ) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0,0);
    texture.repeat.set(4,1);
  })

  var bumptexture = loader.load('SU_TexRockGrassLongBump.png', function ( texture ) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0,0);
    texture.repeat.set(4,1);
  })

  const Geom = new THREE.BoxGeometry(2, 2, 2);
  const Matt = [new THREE.MeshPhongMaterial( {map: texture, specularMap: spectexture, bumpMap: bumptexture, specular: lightColor} ),
  new THREE.MeshPhongMaterial( {map: texture, specularMap: spectexture, bumpMap: bumptexture, specular: lightColor} ),
  new THREE.MeshPhongMaterial( {map: loader.load('SU_Grass.png'), specularMap: loader.load('SU_GrassSpec.png'), specular: lightColor} ),
  null,
  new THREE.MeshPhongMaterial( {map: texture, specularMap: spectexture, bumpMap: bumptexture, specular: lightColor} ),
  new THREE.MeshPhongMaterial( {map: texture, specularMap: spectexture, bumpMap: bumptexture, specular: lightColor} ),];
  cubeStone = [new THREE.Mesh( Geom, Matt ), new THREE.Mesh( Geom, Matt ),
  new THREE.Mesh( Geom, Matt ), new THREE.Mesh( Geom, Matt )]; 
  scene.add( cubeStone[0] );
  scene.add( cubeStone[1] );
  scene.add( cubeStone[2] );
  // scene.add( cubeStone[3] );
}

function bushObjGo(num){
  const Matt = new THREE.MeshLambertMaterial({map: loader.load('SU_Grass.png'), transparent: true, alphaMap: loader.load('SU_TreeBushyAlpha.png'), side: THREE.DoubleSide, depthWrite: false})
  
  const bushGeom = [];
  bushObj = [];
  for (let i = 0; i < num; i ++){
    bushGeom.push(new THREE.PlaneGeometry(2, 2));
    bushObj.push(new THREE.Mesh(bushGeom[i], Matt));
    scene.add(bushObj[i]);
  }
}

function rockStoneGo(num){
  var texture = loader.load('SU_RockGrass.png', function ( texture ) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0,0);
    texture.repeat.set(3,3);
  })

  var spectexture = loader.load('SU_RockGrassSpec.png', function ( texture ) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0,0);
    texture.repeat.set(3,3);
  })

  var bumptexture = loader.load('SU_RockGrassBump.png', function ( texture ) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0,0);
    texture.repeat.set(3,3);
  })

  const Geom = new THREE.SphereGeometry(1, 5, 5);
  const Matt = new THREE.MeshPhongMaterial( {map: texture, specularMap: spectexture, bumpMap: bumptexture, specular: lightColor} );
  rockStone = [new THREE.Mesh( Geom, Matt ), new THREE.Mesh( Geom, Matt ),
    new THREE.Mesh( Geom, Matt ), new THREE.Mesh( Geom, Matt )]; 
  scene.add( rockStone[0] );
  scene.add( rockStone[1] );
  scene.add( rockStone[2] );
  if (num > 3){
    for (let i = 3 ; i < num; i++){
      rockStone.push(new THREE.Mesh( Geom, Matt ));
      scene.add( rockStone[i] );
    }
  }
}

function waterSandGo(){
  var texture = loader.load('SU_TexSandSub.png', function ( texture ) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0,0);
    texture.repeat.set(4,4);
  })
  const Geom = new THREE.CylinderGeometry(2, 10, 2, 20);
  const Matt = [new THREE.MeshLambertMaterial({map: texture, transparent: true, opacity: 0.99, depthWrite: false, alphaMap: loader.load('AlphaGrad.png'), side: THREE.DoubleSide}),
  null
  , null];
  waterSand = new THREE.Mesh(Geom, Matt);
  
  scene.add(waterSand);
}

function treeLeavesGo(rot, height, wide){
  treeLCount = treeLCount + 1;
  var texture = loader.load('SU_Leaf.png', function ( texture ) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(rot,0);
    texture.repeat.set(4,1);
  })
  var alphaTexture = loader.load('SU_LeafAlpha.png', function ( texture ) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(rot,0);
    texture.repeat.set(4,1);
  })
  const Geom = new THREE.CylinderGeometry(0.05, wide, height, 20);
  const Matt = [new THREE.MeshLambertMaterial({map: texture, transparent: true, depthWrite: false, alphaMap: alphaTexture, side: THREE.DoubleSide}),
  null
  , null];
  treeLeaves.push(new THREE.Mesh(Geom, Matt));
  treeLeaves[treeLCount - 1].geometry.translate(0, -(height/2), 0)
  scene.add(treeLeaves[treeLCount - 1]);
}

function treeBarkGo(num){
  var texture = loader.load('SU_TexWood.png', function ( texture ) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0,0);
    texture.repeat.set(4,1);
  })
  const Geom = new THREE.CylinderGeometry(0.08, 0.1, 5, 20);
  const Matt = [new THREE.MeshLambertMaterial({map: texture}),
  new THREE.MeshLambertMaterial({map: loader.load('SU_TexWoodTop.png')})
  , new THREE.MeshLambertMaterial({map: loader.load('SU_TexWoodTop.png')})];
  treeBark = [];
  for (let i = 0; i < num; i++){
    treeBark.push(new THREE.Mesh(Geom, Matt));
    treeBark[i].renderOrder = 2;
    scene.add(treeBark[i]);
  }
}

function waterGo(){
  waterTex = loader.load('SU_TexWater.png', function ( texture ) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0,0);
    texture.repeat.set(4,4);
  })
  const Geom = new THREE.CylinderGeometry(2, 10, 0.1, 20);
  const Matt = [new THREE.MeshPhongMaterial({map: waterTex, transparent: true, opacity: 0.6, alphaMap: loader.load('AlphaGradWat.png'), side: THREE.DoubleSide}),
  null
  , null];
  water = new THREE.Mesh(Geom, Matt);
  water.renderOrder = 1;
  scene.add(water);
}

function werehogMdlGo(){
  gltfLoader.load('./assets/Models/Werehog/model_Werehog.gltf', (gltfScene) => {
    werehogMdl = gltfScene;

    werehogMdl.scene.position.x = -1;
    werehogMdl.scene.position.y = 0.02;
    werehogMdl.scene.position.z = -0.15;
    werehogMdl.scene.rotation.y = -.5*Math.PI;
    werehogMdl.scene.scale.x = 0.45;
    werehogMdl.scene.scale.y = 0.45;
    werehogMdl.scene.scale.z = 0.45;

    gltfScene.scene.traverse( function ( child ) {

      if ( child.isMesh ) { 
  
          child.material.side = THREE.FrontSide;
  
       }
      }
    )

    scene.add(werehogMdl.scene);
  })
}

function chipMdlGo(){
  gltfLoader.load('./assets/Models/Chip/model_Chip.gltf', (gltfScene) => {
    chipMdl = gltfScene;

    chipMdl.scene.position.x = -1;
    chipMdl.scene.position.y = 0.05;
    chipMdl.scene.position.z = 0.15;
    chipMdl.scene.rotation.y = -.5*Math.PI;
    chipMdl.scene.scale.x = 0.45;
    chipMdl.scene.scale.y = 0.45;
    chipMdl.scene.scale.z = 0.45;

    scene.add(chipMdl.scene);
  })
}

function buildMdl1Go(){
  gltfLoader.load('./assets/Models/Building1/Model_Build1.gltf', (gltfScene) => {
    buildMdl1 = gltfScene;

    buildMdl1.scene.position.x = 10;
    buildMdl1.scene.position.y = 0.05;
    buildMdl1.scene.position.z = -9;
    buildMdl1.scene.rotation.x = 0.4;
    buildMdl1.scene.rotation.z = -0.3;
    buildMdl1.scene.scale.x = 2;
    buildMdl1.scene.scale.y = 2.6;
    buildMdl1.scene.scale.z = 2;

    gltfScene.scene.traverse( function ( child ) {

      if ( child.isMesh ) { 
  
          child.material.side = THREE.FrontSide;
  
       }
      }
    )

    scene.add(buildMdl1.scene);
  })
}

function buildMdl2Go(){
  gltfLoader.load('./assets/Models/Building2/Model_Build2New.gltf', (gltfScene) => {
    buildMdl2 = gltfScene;

    buildMdl2.scene.position.x = 14.8;
    buildMdl2.scene.position.y = 0.05;
    buildMdl2.scene.position.z = -2;
    buildMdl2.scene.rotation.y = -2;
    buildMdl2.scene.scale.x = 1.8;
    buildMdl2.scene.scale.y = 1.7;
    buildMdl2.scene.scale.z = 3;

    gltfScene.scene.traverse( function ( child ) {

      if ( child.isMesh ) { 
  
          child.material.side = THREE.FrontSide;
  
       }
      }
    )

    scene.add(buildMdl2.scene);
  })
}

function buildMdl3Go(){
  gltfLoader.load('./assets/Models/Building2/Model_Build2New.gltf', (gltfScene) => {
    buildMdl3 = gltfScene;

    buildMdl3.scene.position.x = 2;
    buildMdl3.scene.position.y = 3;
    buildMdl3.scene.position.z = 6;
    buildMdl3.scene.rotation.y = -2.5;
    buildMdl3.scene.scale.x = 1;
    buildMdl3.scene.scale.y = 0.7;
    buildMdl3.scene.scale.z = 0.7;

    gltfScene.scene.traverse( function ( child ) {

      if ( child.isMesh ) { 
  
          child.material.side = THREE.FrontSide;
  
       }
      }
    )

    scene.add(buildMdl3.scene);
  })
}

function firefliesGo() {
  const points = [];

  for (let i = 0; i < 500; i++) {
    let firefly = new THREE.Vector3(
      Math.random() * 30 - 15,
      Math.random() * 30 - 15,
      Math.random() * 30 - 15
    );
    points.push(firefly);
  }

  flyGeo = new THREE.BufferGeometry().setFromPoints(points);

  let sprite = new THREE.TextureLoader().load("./assets/textures/SU_Firefly.png");
  let alphaSprite = new THREE.TextureLoader().load("./assets/textures/SU_FireflyAlpha.png");
  let flyMaterial = new THREE.PointsMaterial({
    size: 0.05,
    map: sprite,
    transparent: true,
    alphaMap: alphaSprite
  });

  fireflies = new THREE.Points(flyGeo, flyMaterial);
  fireflies.renderOrder = 2;
  scene.add(fireflies);
}

function animateFireflies(){
  fireflies.renderOrder = 1;
  flyGeo.verticesNeedUpdate = true;
  fireflies.rotation.y += 0.001;
  fireflies.rotation.z += 0.0005;

  waterTex.offset.x += 0.0001;
  waterTex.offset.y += 0.0005;
}

// Variables and Values
camera.position.z = 5;

dirLight.position.x = -15;
dirLight.position.y = 3.5;
dirLight.position.z = 2;

function setLoc(obj, x, y, z){
	obj.position.x = x;
	obj.position.y = y;
	obj.position.z = z;
}

function setRot(obj, x, y, z){
	obj.rotation.x = x;
	obj.rotation.y = y;
	obj.rotation.z = z;
}

function setScale(obj, x, y, z){
	obj.scale.x = x;
	obj.scale.y = y;
	obj.scale.z = z;
}

setScale(bridge[0], 2.7, 1, 1);
setLoc(bridge[0], -0.35, 0, 0);
setRot(bridge[0], 0, 0, 0);

// bridge

setRot(bridge[1], 0, 0, -0.5);
setLoc(bridge[1], 1.4, -0.238, 0);

// bridge stands

setRot(stand[0], 0.06, -0.05, -0.03);
setScale(stand[0], 0.5, 0.9, 0.55);
setLoc(stand[0], -1.5, 0.15, 0.50);

setRot(stand[1], -0.03, -0.05, -0.03);
setScale(stand[1], 0.5, 0.9, 0.55);
setLoc(stand[1], -1.5, 0.15, -0.55);

setRot(stand[2], 0.03, -0.05, -0.03);
setScale(stand[2], 0.5, 0.6, 0.55);
setLoc(stand[2], 0.9, 0.1, 0.55);

setRot(stand[3], -0.03, -0.05, -0.03);
setScale(stand[3], 0.5, 0.6, 0.55);
setLoc(stand[3], 0.9, 0.1, -0.55);

// lamp holders and lamps

setScale(lampStand[0], 1.2, 2.7, 1);
setLoc(lampStand[0], 0, -1, -0.3);
lampStand[0].rotation.copy(new THREE.Euler(0, 1.2, 0, "YXZ"));

lampObjGo("B");
setLoc(lampObj[0], -0.05, 1.35, -0.2);
setLoc(lampLight[0], -0.05, 1.35, -0.2);

setScale(lampStand[1], 1.2, 2.7, 1);
setLoc(lampStand[1], -1.5, -1, 0.3);
lampStand[1].rotation.copy(new THREE.Euler(0, -1.2, 0, "YXZ"));

lampObjGo("R");
setLoc(lampObj[1], -1.55, 1.35, 0.2);
setLoc(lampLight[1], -1.55, 1.35, 0.2);

lampObjGo("B");
setLoc(lampObj[2], -0.05, -1.20, -0.2);
setLoc(lampLight[2], -0.05, -1.20, -0.2);

lampObjGo("R");
setLoc(lampObj[3], -1.55, -1.20, 0.2);
setLoc(lampLight[3], -1.55, -1.20, 0.2);

lampObjGo("G");
setLoc(lampObj[4], 1.1, -0.2, -0.7);
setRot(lampObj[4], 0, 0.6, 0);
setLoc(lampLight[4], 1.1, 0, -0.7);

lampObjGo("G");
setLoc(lampObj[5], 7, 0, -6);
setRot(lampObj[5], 0, 0, 0);
setLoc(lampLight[5], 7, 0.2, -6);

lampObjGo("R");
setLoc(lampObj[6], 9.5, 0.2, -2);
setRot(lampObj[6], 0, 0, 0);
setLoc(lampLight[6], 9.5, 0.4, -2);

lampObjGo("B");
setLoc(lampObj[7], -0.05, 3.2, 5);
setLoc(lampLight[7], -0.05, 3.2, 5);

// trees
// 1
setScale(treeBark[0], 1, 1, 1);
setLoc(treeBark[0], 8, 1.5, -2);
treeBark[0].rotation.copy(new THREE.Euler(-0.2, 0, -0.2, "YXZ"));

treeLeavesGo(0, 0.8, 0.85);
setScale(treeLeaves[0], 1, 1, 1);
setLoc(treeLeaves[0], 8.51, 3.95, -2.5);
treeLeaves[0].rotation.copy(new THREE.Euler(-0.2, 0, -0.2, "YXZ"));

treeLeavesGo(0.7, 0.2, 1);
setScale(treeLeaves[1], 1, 1, 1);
setLoc(treeLeaves[1], 8.51, 3.95, -2.5);
treeLeaves[1].rotation.copy(new THREE.Euler(-0.2, 0, -0.2, "YXZ"));

treeLeavesGo(1.4, -0.1, 0.6);
setScale(treeLeaves[2], 1, 1, 1);
setLoc(treeLeaves[2], 8.51, 3.95, -2.5);
treeLeaves[2].rotation.copy(new THREE.Euler(-0.2, 0, -0.2, "YXZ"));

// 2
setScale(treeBark[1], 1, 1, 1);
setLoc(treeBark[1], 3.85, -0.6, 2);
treeBark[1].rotation.copy(new THREE.Euler(-0.07, 0, 0, "YXZ"));

treeLeavesGo(0, 0.5, 0.85);
setScale(treeLeaves[3], 1, 1, 1);
setLoc(treeLeaves[3], 3.85, 1.9, 1.85);
treeLeaves[3].rotation.copy(new THREE.Euler(0, 0, 0, "YXZ"));

treeLeavesGo(0, -0.1, 0.5);
setScale(treeLeaves[4], 1, 1, 1);
setLoc(treeLeaves[4], 3.85, 1.9, 1.85);
treeLeaves[4].rotation.copy(new THREE.Euler(0, 0, 0, "YXZ"));

// sand and grass


setRot(sandLand[0], 0, 2.25, 0);
setScale(sandLand[0], 3, 0.2, 6);
setLoc(sandLand[0], 9.5, -0.5, -2.1);

setRot(grassLand[0], 0, 2.25, 0);
setScale(grassLand[0], 2.5, 0.2, 4);
setLoc(grassLand[0], 10, -0.3, 1);

// water and sand

setRot(water, 0, 2.25, 0);
setScale(water, 3, 0.6, 6);
setLoc(water, 9.5, -0.53, -2.1);

setRot(waterSand, 0, 2.25, 0);
setScale(waterSand, 3, 0.6, 6);
setLoc(waterSand, 9.5, -1.1, -2.1);

// terraform

setRot(cubeStone[0], -0.15, -1.3, -0.1);
setScale(cubeStone[0], 2, 2, 3);
setLoc(cubeStone[0], 2.7, 1, 5.7);

setRot(cubeStone[1], 0, -0.8, 0);
setScale(cubeStone[1], 2, 2, 3);
setLoc(cubeStone[1], 6.2, 0.8, 4.2);

setRot(cubeStone[2], 0, -1.2, -0.09);
setScale(cubeStone[2], 4, 4, 2);
setLoc(cubeStone[2], 9.5, 1.5, 3.4);

// bushes

setRot(bushObj[0], 1.5, 0, -0.09);
setScale(bushObj[0], 2, 2, 0.01);
setLoc(bushObj[0], 5, 3, 4.5);

setScale(bushObj[2], 2, 2, 0.01);
setLoc(bushObj[2], 4, 2.7, 5);
bushObj[2].rotation.copy(new THREE.Euler(-0.5, 0.8, -0.04, "YXZ"));

setScale(bushObj[3], 3, 3, 0.01);
setLoc(bushObj[3], 6, 3.7, 5.7);
bushObj[3].rotation.copy(new THREE.Euler(-0.5, 1, -0.5, "YZX"));

setScale(bushObj[1], 2, 3, 0.01);
setLoc(bushObj[1], 4, 3.7, 5.7);
bushObj[1].rotation.copy(new THREE.Euler(-0.5, 0.1, -0.5, "YZX"));

setScale(bushObj[4], 2, 2, 0.01);
setLoc(bushObj[4], 6.9, 2.5, 3);
bushObj[4].rotation.copy(new THREE.Euler(-0.1, 1.7, -0.5, "YZX"));

setScale(bushObj[5], 2, 2, 0.01);
setLoc(bushObj[5], 7.55, 5, 3);
bushObj[5].rotation.copy(new THREE.Euler(-0.1, 1.9, -0.5, "YZX"));

setScale(bushObj[6], 3, 3.5, 0.01);
setLoc(bushObj[6], 9.3, 6, 3);
bushObj[6].rotation.copy(new THREE.Euler(-0.5, 1, -0.5, "YZX"));

setScale(bushObj[7], 1.8, 2.4, 0.01);
setLoc(bushObj[7], 9.3, 6, 2);
bushObj[7].rotation.copy(new THREE.Euler(-0, 0.4, -0.5, "YZX"));

// stones

setScale(rockStone[0], 4, 2, 1);
setLoc(rockStone[0], 4.2, 0, 3.2);
rockStone[0].rotation.copy(new THREE.Euler(0, 0.4, 0.2, "YXZ"));

setScale(rockStone[1], 2, 2.5, 1.5);
setLoc(rockStone[1], 7, 0, 1);
rockStone[1].rotation.copy(new THREE.Euler(0, 0.4, 0, "YXZ"));

setScale(rockStone[2], 0.8, 0.8, 0.8);
setLoc(rockStone[2], 5.1, 0, 1.9);
rockStone[2].rotation.copy(new THREE.Euler(0, 0.4, 0, "YXZ"));

setScale(rockStone[3], 0.8, 4, 3.5);
setLoc(rockStone[3], 11.5, 0, 3);
rockStone[3].rotation.copy(new THREE.Euler(0, 0.4, 0, "YXZ"));

setScale(rockStone[4], 0.8, 4, 2);
setLoc(rockStone[4], 10.7, 0, 0.5);
rockStone[4].rotation.copy(new THREE.Euler(1, 0.4, 0, "YXZ"));

setScale(rockStone[5], 1.5, 1, 1);
setLoc(rockStone[5], 9.9, 3, -0.2);
rockStone[5].rotation.copy(new THREE.Euler(-1, -0.2, 0, "YXZ"));

setScale(rockStone[6], 1, 1.5, 2);
setLoc(rockStone[6], 0.2, 0, 7);
rockStone[6].rotation.copy(new THREE.Euler(0, 0.2, -0.2, "YXZ"));

setScale(rockStone[7], 1, 1.2, 1);
setLoc(rockStone[7], 4, 0, -5.6);
rockStone[7].rotation.copy(new THREE.Euler(0, 0.2, -0.2, "YXZ"));

setScale(rockStone[8], 0.3, 0.3, 0.3);
setLoc(rockStone[8], 2, -0.6, -6);
rockStone[8].rotation.copy(new THREE.Euler(0, 0.2, -0.2, "YXZ"));

camera.rotation.copy(new THREE.Euler(0, 0, 0, "YXZ"));

function animate() {
	requestAnimationFrame( animate );

  if (camera.position.y < 0.2){
    camera.position.y = 0.199;
  }

  if (camera.position.z > 7.5){
    camera.position.z = 7.499;
  }

  animateFireflies();

	renderer.render( scene, camera );
}
animate();