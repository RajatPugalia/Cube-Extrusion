import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector3, Color3, Color4, StandardMaterial, DirectionalLight, Mesh, MeshBuilder, VertexBuffer } from "@babylonjs/core";

//Please check end of file for implementation logic

//create canvas
var canvas = document.createElement("canvas");
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.id = "cubeCanvas";
document.body.appendChild(canvas);

// initialize babylon engine, scene, camera, light and cube(box)
var engine = new Engine(canvas, true);
var scene = new Scene(engine);

var camera: ArcRotateCamera = new ArcRotateCamera("Camera", -3*Math.PI / 4, Math.PI / 4, 4, Vector3.Zero(), scene);
camera.attachControl(canvas, true);

// Create directional light
var dirLight = new DirectionalLight(
'dirLight',
new Vector3(1, 1, 1),
scene
);
dirLight.intensity = 0.5;

var dirLight = new DirectionalLight(
'dirLight',
new Vector3(-1, -1, -1),
scene
);
dirLight.intensity = 0.5;

//cube Mesh
var box: Mesh = MeshBuilder.CreateBox("box", {height: 1, width: 1, depth: 1, updatable: true}, scene);
box.position = Vector3.Zero();
var material = new StandardMaterial('material', scene);
material.diffuseColor = new Color3(1, 0, 0);
material.alpha = 0.5;
box.material = material;
box.isPickable = true;

//Show edges of the cube
box.enableEdgesRendering();
box.edgesWidth = 1;
box.edgesColor = new Color4(0, 0, 1, 1);

var planeMaterial = new StandardMaterial("planeMaterial", scene);
planeMaterial.alpha = 0;  // Transparency of the plane

//declare and initialize variables
var extrusionEnabled = false;
var faceSelected = null;
var selFaceIndices;
var positions;
var faceNormal;
var planeMesh;
var startPoint;
var endPoint;

//Event listener to handle click action on Cube
canvas.addEventListener("click", function(event) {
    if (!extrusionEnabled) {
        var pickResult = scene.pick(event.clientX, event.clientY);

        //If click is on any mesh and it is box mesh
        if (pickResult.hit && pickResult.pickedMesh === box) {
            if(planeMesh){
                planeMesh.dispose();
            }
            faceSelected = pickResult.faceId;
            extrusionEnabled = true;
            box.isPickable = false;
            startPoint = pickResult.pickedPoint;

            setAllIndicesAttachedtoFace();

            //Vector normal to the face
            faceNormal = pickResult.getNormal();
            var rotVector: Vector3 = faceNormal;

            if(faceNormal.z != 0){
                rotVector = new Vector3(1, 1, 0);
            }
            
            planeMesh = MeshBuilder.CreatePlane("plane", { size: Number.MAX_SAFE_INTEGER }, scene);
            planeMesh.position = startPoint;
            planeMesh.rotation = rotVector.scale(Math.PI / 2);
            planeMesh.material = planeMaterial;           
        }
    } else {
        box.isPickable = true;
        extrusionEnabled = false;
        faceSelected = null;
        if(planeMesh){
            planeMesh.dispose();
        }
    }
});

//Event listener to handle movement of mouse after clicking on cube
canvas.addEventListener("mousemove", function(){
    if(extrusionEnabled && faceSelected){
        var mouseMovementVector = mouseMovement();

        //Dot product of normal to the face and movement of mouse
        var dot = Vector3.Dot(faceNormal, mouseMovementVector)
        var projection = dot/faceNormal.length();//Project of movement along normal of face

        //Direction of extrusion is along face normal and magnitude is value of projection
        var scaleVector = faceNormal.scale(projection);;

        //Required positions of cube is updated.        
        for (var i = 0; i < selFaceIndices.length; i++) {
            var index = selFaceIndices[i];
            positions[index*3] += (scaleVector.x);
            positions[index*3 + 1] += (scaleVector.y);
            positions[index*3 + 2] += (scaleVector.z);
        }

        box.updateVerticesData(VertexBuffer.PositionKind, positions);
        box.refreshBoundingInfo();
        box.enableEdgesRendering();
    }
})

//method to calculate movement of mouse Vector
function mouseMovement(){

    var mouseMovementVector;
    var pickResult = scene.pick(scene.pointerX, scene.pointerY);
    
    if (pickResult.hit && pickResult.pickedMesh === planeMesh) {
        endPoint = pickResult.pickedPoint;
        mouseMovementVector = endPoint.subtract(startPoint);
        startPoint = endPoint;
    }
    return mouseMovementVector;
}

//Check if an array is inside another array of arrays
function isSubArray(subArray, array) {
    return array.some(item => {
    return item.length === subArray.length && item.every((value, index) => value === subArray[index]);
    });
}
//Select all the indices that are on the vertices of selected face.
function setAllIndicesAttachedtoFace(){
    positions = box.getVerticesData(VertexBuffer.PositionKind);
    var faceIndices = box.getIndices();

    // Calculate the start index for the face
    var startIndex = Math.floor(faceSelected/2) * 6;

    // Get the face indices
        selFaceIndices = [
        faceIndices[startIndex],
        faceIndices[startIndex + 1],
        faceIndices[startIndex + 2],
        faceIndices[startIndex + 3],
        faceIndices[startIndex + 4],
        faceIndices[startIndex + 5]
    ];

    selFaceIndices = Array.from(new Set(selFaceIndices));

    var selectedVertices = [[]];

    for (let i = 0; i < selFaceIndices.length; i++) {
        var index = selFaceIndices[i];
        selectedVertices[i] = [positions[index*3], positions[index*3 + 1], positions[index*3 + 2]]
    }

    for (let i = 0; i < positions.length; i+=3) {
        var curVertex = [positions[i], positions[i+1], positions[i+2]];
        if(isSubArray(curVertex, selectedVertices)){
            selFaceIndices.push(i/3);
        }

    }
    selFaceIndices = Array.from(new Set(selFaceIndices));
}

// run the main render loop
engine.runRenderLoop(() => {
    scene.render();
});

/*
Core implementation is as follows:
    1. There are two eventsListeners on canvas, one when mouse is clicked and other when mouse moves.
    2. If mouse is clicked on any face and not already clicked on any of the faces of the cube then faceSelected is initialized and extrusionEnabled is set to true.
    3. If mouse is clicked anywhere and it was already clicked on any face then faceSelected is set to null and extrusionEnabled to false.
    4. Now, case 2 happens then selFaceIndices[] is populated with all the indices that the sides have including the indices from adjacent faces. 
       Also, a plane is created parallel to normal and passing through the point where the mouse was clicked.
    5. When extrusionEnabled is true and mouse moves, then vector for the movement of mouse is obtaied and dot product of this vector with normal to the face is calculated.
    6. Scale of extrusion will be same as the mouseMovementVector projection along the normal of the face, same is calculated and implemented.
    7. The extrusion will take place in the diretion of normal of selected face or opposite of it..
    8. Finally, a for loop is ran to update positions(vertices of sides), to update the position of the cube.

Logic for function setAllIndicesAttachedtoFace():
    1. All the positions (vertices of each side) is obtained, face indices are also calculated for selected face and stored in selFaceIndices.
    2. As each vertex shares 3 faces, so each vertex has 3 positions, so in order to make sure the geometry of cube is not broken, all the positions and thereby indices 
       are calculated which share the vertices of the selected face.
    3. Once we have all the indices in selFaceIndices, it is used in the event listener function to update positions of the cube.
*/