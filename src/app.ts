import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector2, Vector3, Color3, Matrix, Color4, StandardMaterial, DirectionalLight, Mesh, MeshBuilder, VertexBuffer } from "@babylonjs/core";

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

var camera: ArcRotateCamera = new ArcRotateCamera("Camera", 0, 0, 5, new Vector3(1, 1, 1), scene);
camera.setPosition(new Vector3(0, 0, 4));
camera.target = new Vector3(0, 0, 0);
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
box.position = new Vector3(-2, 0, 0);
var material = new StandardMaterial('material', scene);
material.diffuseColor = new Color3(1, 0, 0);
box.material = material;

//Show edges of the cube
box.enableEdgesRendering();
box.edgesWidth = 1;
box.edgesColor = new Color4(0, 0, 1, 1);

//Sphere
const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
sphere.material = material;
sphere.position = new Vector3(2, 0, 0);

//declare and initialize variables
var extrusionEnabled = false;
var extrusionEnabledSphere = false;
var faceSelected = null;
var lastMousePositionX = null;
var lastMousePositionY = null;
var extrusionDistance = 0;
var selFaceIndices;
var positions;
var faceNormal;

//Event listener to handle click action on Cube
canvas.addEventListener("click", function(event) {
    if (!extrusionEnabled && !extrusionEnabledSphere) {
        var pickResult = scene.pick(event.clientX, event.clientY);

        if (pickResult.pickedMesh === box){
            extrusionEnabled = true;
        }
        else if (pickResult.pickedMesh === sphere){
            extrusionEnabledSphere = true;
        }
        //If click is on any object and it is box object
        if (pickResult.hit && pickResult.pickedMesh === box && extrusionEnabled) {
            faceSelected = pickResult.faceId;
            lastMousePositionX = event.clientX;
            lastMousePositionY = event.clientY;

            setAllIndicesAttachedtoFace();

            //Vector normal to the face
            faceNormal = new Vector3(
            box.getFacetNormal(faceSelected).x,
            box.getFacetNormal(faceSelected).y,
            box.getFacetNormal(faceSelected).z
          );
        }
        else if (pickResult.hit && pickResult.pickedMesh === sphere  && extrusionEnabledSphere){
            lastMousePositionX = event.clientX;
            lastMousePositionY = event.clientY;
        }
    } else {
        extrusionEnabled = false;
        extrusionEnabledSphere = false;
        faceSelected = null;
    }
});

//Event listener to handle movement of mouse after clicking on cube
canvas.addEventListener("mousemove", function(event){
    if(extrusionEnabled && faceSelected){

        var mouseMovementVector = mouseMovement(event, lastMousePositionX, lastMousePositionY);
        
        //Extrusion distance is set as 0.0075 units by trail and error due to time constraint, it can be set dynamically based on movement of mouse
        //This will also take care that the transition of shapes is smooth i.e, animation is proper.
        extrusionDistance = 0.0075;

        //Dot product of normal to the face and movement of mouse, which will be later used to check if we want to increase or drcrease size
        var dot = Vector3.Dot(faceNormal, mouseMovementVector)

        //Direction of extrusion
        var scaleVector = faceNormal;

        if(dot < 0 && Vector3.Dot(faceNormal, new Vector3(1, 1, 1)) > 0)
            scaleVector = faceNormal.negate();

        else if(dot > 0 && Vector3.Dot(faceNormal, new Vector3(1, 1, 1)) < 0)
            scaleVector = faceNormal.negate();

        //extrusion is scaled to extrusionDistance
        scaleVector = scaleVector.scale(extrusionDistance);

        //Required positions of cube is updated.        
        for (var i = 0; i < selFaceIndices.length; i++) {
            var index = selFaceIndices[i];
            positions[index*3] *= (1 + scaleVector.x);
            positions[index*3 + 1] *= (1 + scaleVector.y);
            positions[index*3 + 2] *= (1 + scaleVector.z);
        }

        box.updateVerticesData(VertexBuffer.PositionKind, positions);
        box.refreshBoundingInfo();
        box.enableEdgesRendering();
    }

    if (extrusionEnabledSphere) {
        const deltaX = event.clientX - lastMousePositionX;
        lastMousePositionX = event.clientX;
        const sensitivity = 0.001; // Adjust the sensitivity of the diameter change

        // Update the diameter of the sphere based on mouse movement
        const newDiameter = sphere.scaling.x + deltaX * sensitivity;
        sphere.scaling = new Vector3(newDiameter, newDiameter, newDiameter);
      }
})

//method to calculate movement of mouse Vector
function mouseMovement(event: any, lastMousePosX: number, lastMousePosY: number){
    // Convert the mouse positions to viewport coordinates
    var startViewportPos = new Vector2(lastMousePositionX / canvas.width, lastMousePositionY / canvas.height);
    var endViewportPos = new Vector2(event.clientX / canvas.width, event.clientY / canvas.height);

    lastMousePositionX = event.clientX
    lastMousePositionY = event.clientY

    // Get the coordinates of the mouse positions in the scene to find the movement of mouse
    var startRay = scene.createPickingRay(startViewportPos.x, startViewportPos.y, Matrix.Identity(), camera);
    var endRay = scene.createPickingRay(endViewportPos.x, endViewportPos.y, Matrix.Identity(), camera);
    var startPoint = startRay.origin;
    var endPoint = endRay.origin;

    var mouseMovementVector = endPoint.subtract(startPoint);
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

//reset sphere
const resetSphereButton = document.createElement("button");
resetSphereButton.textContent = "Reset Sphere";
resetSphereButton.style.position = 'absolute';
resetSphereButton.style.bottom = '20px';
resetSphereButton.style.left = '20%';
resetSphereButton.style.transform = 'translateX(-50%)';
canvas.parentNode.appendChild(resetSphereButton);

// Add click event listener to the reset button
resetSphereButton.addEventListener("click", () => {
    sphere.scaling = new Vector3(1, 1, 1);
});

//reset cube
const resetCubeButton = document.createElement("button");
resetCubeButton.textContent = "Reset Cube";
resetCubeButton.style.position = 'absolute';
resetCubeButton.style.bottom = '20px';
resetCubeButton.style.left = '80%';
resetCubeButton.style.transform = 'translateX(-50%)';
canvas.parentNode.appendChild(resetCubeButton);

// Add click event listener to the reset button
resetCubeButton.addEventListener("click", () => {
    var boxDup: Mesh = MeshBuilder.CreateBox("boxDup", {height: 1, width: 1, depth: 1, updatable: true}, scene);
    boxDup.position = new Vector3(-2, 0, 0);

    box.updateVerticesData(VertexBuffer.PositionKind, boxDup.getVerticesData(VertexBuffer.PositionKind));
    box.refreshBoundingInfo();
    box.enableEdgesRendering();
    boxDup.dispose();
});

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
       Also, position of mouse is captured and normal vector to the face on which mouse was clicked is calculated.
    5. When extrusionEnabled is true and mouse moves, then vector for the movement of mouse is obtaied and dot product of this vector with normal to the face is calculated.
    6. Scale of extrusion(extrusionDistance) for the mouse movement is set as 0.0075, which seems in line with mouse movement, this is hardcoded for now, but can be 
       implemented based on the distance of movement of the mouse.
    7. The extrusion will take place in the diretion of normal of selected face or opposite of it, based on dot product and direction of normal.
    8. Finally, a for loop is ran to update positions(vertices of sides), to update the position of the cube.

Logic for function setAllIndicesAttachedtoFace():
    1. All the positions (vertices of each side) is obtained, face indices are also calculated for selected face and stored in selFaceIndices.
    2. As each vertex shares 3 faces, so each vertex has 3 positions, so in order to make sure the geometry of cube is not broken, all the positions and thereby indices 
       are calculated which share the vertices of the selected face.
    3. Once we have all the indices in selFaceIndices, it is used in the event listener function to update positions of the cube.
*/