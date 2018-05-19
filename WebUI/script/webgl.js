var camera, scene, renderer, control, grid, texture, mesh;

init();

render();

function init() {
	renderer = new THREE.WebGLRenderer({
		alpha: true
	});

	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	$('#page').append(renderer.domElement);

	camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 3000);
	camera.position.set(538, 120, 330);

	scene = new THREE.Scene();

	window.addEventListener('resize', onWindowResize, false);

	CreateGizmo(507.140625, 115.149216, 261.648438);
}


function CreateGizmo(x, y, z) {
	if (grid != null) {
		console.log("Gizmo already exist")
	}

	grid = new THREE.GridHelper(15, 10)
	scene.add(grid);
	grid.position.set(x, y, z);

	texture = new THREE.TextureLoader().load('textures/crate.gif', render);
	texture.mapping = THREE.UVMapping;
	texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
	var geometry = new THREE.BoxBufferGeometry(0.1, 0.1, 0.1);
	var material = new THREE.MeshLambertMaterial({
		map: texture
	});
	control = new THREE.TransformControls(camera, renderer.domElement);
	control.setSpace("local");
	control.addEventListener('change', onControlChanged);
	control.addEventListener('mouseUp', onMouseUp, false);
	control.addEventListener('mouseDown', onMouseDown, false);

	mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);

	control.attach(mesh);
	scene.add(control);

	mesh.position.set(x, y, z);

	HideGizmo();

	render();
}

function SetGizmoAt(lx, ly, lz, ux, uy, uz, fx, fy, fz, x, y, z, ) {
	let m = new THREE.Matrix4();

	m.set(lx, ux, fx, 0,
		ly, uy, fy, 0,
		lz, uz, fz, 0,
		0, 0, 0, 0);
	grid.scale.set(1, 1, 1);
	mesh.scale.set(1, 1, 1);
	grid.setRotationFromMatrix(m);
	mesh.setRotationFromMatrix(m);
	grid.position.set(x, y, z);
	mesh.position.set(x, y, z);
	render();
}

function HideGizmo() {
	grid.visible = false;
	control.visible = false;
	mesh.visible = false;

	render();
}

function ShowGizmo() {
	control.visible = true;
	grid.visible = true;
	mesh.visible = true;

	render();
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	render();
}

function render() {
	if (control == null) {
		return
	}
	control.update();
	renderer.render(scene, camera);
}

function onControlChanged() {
	if (selectedEntityID < 0) {
		return;
	}
	render();

	//TODO: Invert this method.
	//We should get the matrix and apply it to the mesh, not the other way around.

	let matrix = mesh.matrixWorld.toArray().toString();
	let args = selectedEntityID + "," + matrix;
	console.log(args);

	entityArray[selectedEntityID].matrix = matrix;
	SendEvent('DispatchEventLocal', 'MapEditor:SetEntityMatrix', args);
}

function UpdateCameraPos(x, y, z) {
	camera.position.set(x, y, z);
	camera.position.set(x, y, z);
	// render();
}

function UpdateCameraAngle(lx, ly, lz, ux, uy, uz, fx, fy, fz) {
	let m = new THREE.Matrix4();

	m.set(lx, ux, fx, 0,
		ly, uy, fy, 0,
		lz, uz, fz, 0,
		0, 0, 0, 0);


	camera.setRotationFromMatrix(m);
	render();
}

function SetFov(p_Fov) {
	camera.fov = p_Fov;
	camera.updateProjectionMatrix();
}

function SetGizmoMode(p_Mode) {
	var radio = $('#tools #' + p_Mode);
	radio[0].checked = true;
	$('#tools input').button("refresh");

	if (p_Mode == "select") {
		HideGizmo();
		return
	}

	if (control.visible == false) {
		ShowGizmo();
	}
	control.setMode(p_Mode);
}

function SetWorldSpace(p_Space) {
	if (p_Space == "local" || p_Space == "world") {
		control.setSpace(p_Space);
		var radio = $('#worldSpace #' + p_Space);
		radio[0].checked = true;
		$('#worldSpace input').button("refresh");
	} else {
		console.error("Tried to set an invalid world space")
	}

}

function onMouseUp(e) {
	$('#page canvas').css("z-index", 0)
}

function onMouseDown(e) {
	$('#page canvas').css("z-index", 1)
}