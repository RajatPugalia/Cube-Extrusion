import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector2, Vector3, Color3, Matrix, Color4, StandardMaterial, DirectionalLight, Mesh, MeshBuilder, VertexBuffer } from "@babylonjs/core";

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

// Create material and assign it to the cube
var material = new StandardMaterial('material', scene);
material.diffuseColor = new Color3(1, 0, 0);
box.material = material;

//Show edges of the cube
box.enableEdgesRendering();
box.edgesWidth = 1;
box.edgesColor = new Color4(0, 0, 1, 1);

//declare and initialize variables
var extrusionEnabled = false;
var faceSelected = null;
var lastMousePositionX = null;
var lastMousePositionY = null;
var extrusionDistance = 0;
var selFaceIndices;
var positions;

//Event listener to handle click action on Cube
canvas.addEventListener("click", function(event) {
    if (!extrusionEnabled) {
        var pickResult = scene.pick(event.clientX, event.clientY);
        //If click is on any object and it is box object
        if (pickResult.hit && pickResult.pickedMesh === box) {
            faceSelected = pickResult.faceId;
            extrusionEnabled = true;
            lastMousePositionX = event.clientX
            lastMousePositionY = event.clientY

            setAllIndicesAttachedtoFace()
        }
    } else {
        extrusionEnabled = false;
        faceSelected = null;
    }
});

//Event listener to handle movement of mouse after clicking on cube
canvas.addEventListener("mousemove", function(event){
    if(extrusionEnabled && faceSelected){

        var mouseMovementVector = mouseMovement(event, lastMousePositionX, lastMousePositionY);
        
        //Vector normal to the face
        var faceNormal = new Vector3(
            box.getFacetNormal(faceSelected).x,
            box.getFacetNormal(faceSelected).y,
            box.getFacetNormal(faceSelected).z
          );
        
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

function isSubArray(subArray, array) {
    return array.some(item => {
    return item.length === subArray.length && item.every((value, index) => value === subArray[index]);
    });
}

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
