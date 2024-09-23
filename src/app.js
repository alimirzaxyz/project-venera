let scene, camera, renderer, controls, earthMesh;
let satellites = [];
let selectedSatellite = null;
let hoveredSatellite = null;

let earthRotationSpeed = 0.004167;  // Degrees per second (real time)
let lastTime = Date.now();  // Store the last frame's timestamp

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const earthCenter = new THREE.Vector3(0, 0, 0);

// Cached DOM elements
const hoverLabel = document.getElementById('satellite-hover-label');
const infoDiv = document.getElementById('satellite-info');
const nameElem = document.getElementById('satellite-name');
const detailsElem = document.getElementById('satellite-details');
const satelliteCounterElem = document.getElementById('satellite-counter');

// Initialize the application
init();
animate();

function init() {
  // Create the scene
  scene = new THREE.Scene();

  // Set up the camera
  camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 1000
  );
  camera.position.set(0, 0, 100);

  // Set up the renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000);
  document.body.appendChild(renderer.domElement);

  // Add event listeners
  window.addEventListener('mousemove', onMouseMove, false);
  window.addEventListener('touchstart', handleTouchStart, false); // touchstart for mobile
  window.addEventListener('touchmove', onTouchMove, false); // Add touchmove listener
  window.addEventListener('click', handleMouseClick, false);
  window.addEventListener('resize', onWindowResize, false);

  // Add orbit controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;

  // Set the minimum and maximum distance for zoom
  controls.minDistance = 15;  // Adjust to your desired minimum zoom distance
  controls.maxDistance = 200; // Adjust to your desired maximum zoom distance

  // Add lighting to the scene
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // Add Earth with textures
  const earthGeometry = new THREE.SphereGeometry(10, 64, 64);
  const earthMaterial = new THREE.MeshPhongMaterial({
    map: new THREE.TextureLoader().load('./assets/earth_texture.jpg'),
    bumpMap: new THREE.TextureLoader().load('./assets/earth_normal_map.jpg'),
    bumpScale: 0.05,
    specular: new THREE.Color('grey'),
  });
  earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
  scene.add(earthMesh);

  // Load satellite data
  loadSatelliteData();

  // Display the initial empty panel
  displaySatelliteInfo({
    name: "Select Satellite",
    latitude: 0.00,
    longitude: 0.00,
    altitude: "0.00",
    velocity: "0.00"
  });
}

function deltaTime() {
  const currentTime = Date.now();  // Get the current time
  const delta = (currentTime - lastTime) / 1000;  // Calculate delta in seconds
  lastTime = currentTime;  // Update lastTime to the current time
  return delta;  // Return the delta time in seconds
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function loadSatelliteData() {
  fetch('./assets/satellite_data.json')
    .then(response => response.json())
    .then(data => {
      // Update the satellite counter
      updateSatelliteCounter(data.length);

      data.forEach(satData => {
        if (satData.tle1 && satData.tle2) {
          const satrec = satellite.twoline2satrec(satData.tle1, satData.tle2);

          const satelliteObject = {
            name: satData.name,
            satrec: satrec,
            mesh: createSatelliteMesh(),
            orbit: createOrbitPath(satrec),
          };

          // Initially hide the orbit
          satelliteObject.orbit.visible = false;

          // Add the satellite and orbit to the scene
          satellites.push(satelliteObject);
          scene.add(satelliteObject.mesh);
          scene.add(satelliteObject.orbit);

          // Add the line from the satellite to the Earth's surface
          addLineToEarth(satelliteObject);
        } else {
          console.error('Invalid TLE data for satellite:', satData.name);
        }
      });
    })
    .catch(error => console.error('Error loading satellite data:', error));
}

function createSatelliteMesh() {
  const geometry = new THREE.SphereGeometry(0.05, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  return new THREE.Mesh(geometry, material);
}

function createOrbitPath(satrec) {
  const points = [];
  const meanMotionRevPerDay = satrec.no * (1440 / (2 * Math.PI));
  const isGEO = Math.abs(meanMotionRevPerDay - 1) < 0.01;

  const orbitPeriodMinutes = isGEO ? 1440 / meanMotionRevPerDay : (2 * Math.PI) / satrec.no;
  const orbitPeriodSeconds = orbitPeriodMinutes * 60;
  const numPoints = 50; // Reduced for performance
  const timeStep = orbitPeriodSeconds / numPoints;
  const startTime = new Date();

  for (let i = 0; i <= orbitPeriodSeconds; i += timeStep) {
    const currentTime = new Date(startTime.getTime() + i * 1000);
    const positionAndVelocity = satellite.propagate(satrec, currentTime);
    const positionEci = positionAndVelocity.position;

    if (positionEci) {
      const gmst = satellite.gstime(currentTime);
      const positionGd = satellite.eciToGeodetic(positionEci, gmst);
      const altitude = positionGd.height;

      const radius = 10 + (altitude / 1000);
      const phi = (90 - satellite.degreesLat(positionGd.latitude)) * (Math.PI / 180);
      const theta = (satellite.degreesLong(positionGd.longitude) + 180) * (Math.PI / 180);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      points.push(new THREE.Vector3(x, y, z));
    }
  }

  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x39ff14 });
  return new THREE.Line(orbitGeometry, orbitMaterial);
}

function animate() {
  requestAnimationFrame(animate);

  // Rotate Earth
  earthMesh.rotation.y += THREE.Math.degToRad(earthRotationSpeed) * deltaTime();

  updateSatellites();  // Satellite updates
  if (selectedSatellite) {
      updateSatelliteInfo(selectedSatellite);  // Update the info panel
  }
  controls.update();
  renderer.render(scene, camera);
}

function updateSatellites() {
  const now = new Date();
  satellites.forEach(satelliteObject => {
    const positionAndVelocity = satellite.propagate(satelliteObject.satrec, now);
    const positionEci = positionAndVelocity.position;
    const velocityEci = positionAndVelocity.velocity;

    if (positionEci && velocityEci) {
      const gmst = satellite.gstime(now);
      const positionGd = satellite.eciToGeodetic(positionEci, gmst);

      const latitude = satellite.degreesLat(positionGd.latitude);
      const longitude = satellite.degreesLong(positionGd.longitude);
      const altitude = positionGd.height;

      const radius = 10 + (altitude / 1000);
      const phi = (90 - latitude) * (Math.PI / 180);
      const theta = (longitude + 180) * (Math.PI / 180);

      satelliteObject.mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
      satelliteObject.mesh.position.y = radius * Math.cos(phi);
      satelliteObject.mesh.position.z = radius * Math.sin(phi) * Math.sin(theta);

      const linePositions = satelliteObject.line.geometry.attributes.position.array;
      linePositions[0] = satelliteObject.mesh.position.x;
      linePositions[1] = satelliteObject.mesh.position.y;
      linePositions[2] = satelliteObject.mesh.position.z;

      const scaleFactor = 10 / satelliteObject.mesh.position.length();
      linePositions[3] = satelliteObject.mesh.position.x * scaleFactor;
      linePositions[4] = satelliteObject.mesh.position.y * scaleFactor;
      linePositions[5] = satelliteObject.mesh.position.z * scaleFactor;

      satelliteObject.line.geometry.attributes.position.needsUpdate = true;

      const velocityMagnitude = Math.sqrt(
        velocityEci.x ** 2 +
        velocityEci.y ** 2 +
        velocityEci.z ** 2
      );

      satelliteObject.latitude = latitude;
      satelliteObject.longitude = longitude;
      satelliteObject.altitude = altitude;
      satelliteObject.velocity = (velocityMagnitude * 3600);
    }
  });
}

function updateSatelliteInfo(satelliteObject) {
  displaySatelliteInfo({
    name: satelliteObject.name,
    latitude: satelliteObject.latitude.toFixed(2),
    longitude: satelliteObject.longitude.toFixed(2),
    altitude: satelliteObject.altitude.toFixed(2),
    velocity: satelliteObject.velocity.toFixed(2)
  });
}

let mouseMoveThrottleTimeout = null;
function onMouseMove(event) {
  if (mouseMoveThrottleTimeout) return;
  mouseMoveThrottleTimeout = setTimeout(() => {
    mouseMoveThrottleTimeout = null;
  }, 100); // Adjust the throttle timing as needed

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(satellites.map(sat => sat.mesh));

  if (intersects.length > 0) {
    const hoveredObject = intersects[0].object;
    const satelliteObject = satellites.find(sat => sat.mesh === hoveredObject);

    if (satelliteObject) {
      if (hoveredSatellite !== satelliteObject && satelliteObject !== selectedSatellite) {
        if (hoveredSatellite && hoveredSatellite !== selectedSatellite) {
          hoveredSatellite.mesh.material.color.setHex(0xffffff);
        }
        satelliteObject.mesh.material.color.setHex(0xADD8E6);
        hoveredSatellite = satelliteObject;

        hoverLabel.textContent = satelliteObject.name;
        hoverLabel.style.display = 'block';
        hoverLabel.style.left = `${event.clientX}px`;
        hoverLabel.style.top = `${event.clientY - 20}px`;
      }
    }
  } else {
    if (hoveredSatellite && hoveredSatellite !== selectedSatellite) {
      hoveredSatellite.mesh.material.color.setHex(0xffffff);
      hoveredSatellite = null;
    }
    hoverLabel.style.display = 'none';
  }
}

// Add an empty onTouchMove function to avoid the error, unless you plan to add dragging behavior.
function onTouchMove(event) {
  // For now, leave empty or add touch dragging behavior if needed.
}

function displaySatelliteInfo(satellite) {
  nameElem.textContent = satellite.name || "Unknown";
  detailsElem.innerHTML = `
    <strong>Latitude:</strong> ${satellite.latitude || '0.00'}° <br>
    <strong>Longitude:</strong> ${satellite.longitude || '0.00'}° <br>
    <strong>Altitude:</strong> ${satellite.altitude || '0.00'} km <br>
    <strong>Speed:</strong> ${satellite.velocity || '0.00'} km/h
  `;
  infoDiv.classList.remove('hide');
  infoDiv.classList.add('show');
}

function addLineToEarth(satelliteObject) {
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    satelliteObject.mesh.position, earthCenter
  ]);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x39ff14, linewidth: 2 });
  const line = new THREE.Line(lineGeometry, lineMaterial);

  line.visible = false;
  satelliteObject.line = line;
  scene.add(line);
}

function updateSatelliteCounter(count) {
  satelliteCounterElem.textContent = 'Satellites Tracked: ' + count;
}

document.getElementById('satellite-search').addEventListener('input', function(event) {
  const searchTerm = event.target.value.toUpperCase().trim();
  const resultsContainer = document.getElementById('search-results');

  resultsContainer.innerHTML = '';

  if (searchTerm.length > 0) {
    const filteredSatellites = satellites.filter(sat => sat.name.toUpperCase().startsWith(searchTerm));

    if (filteredSatellites.length > 0) {
      resultsContainer.style.display = 'block';

      filteredSatellites.forEach(satellite => {
        const li = document.createElement('li');
        li.textContent = satellite.name;

        li.addEventListener('click', function(event) {
          event.stopPropagation();
          document.getElementById('satellite-search').value = satellite.name;
          selectSatellite(satellite);
          resultsContainer.style.display = 'none';
        });

        resultsContainer.appendChild(li);
      });
    } else {
      resultsContainer.style.display = 'none';
    }
  } else {
    resultsContainer.style.display = 'none';
  }
});

function selectSatellite(satellite) {
  if (selectedSatellite) {
    selectedSatellite.mesh.material.color.setHex(0xffffff);
    selectedSatellite.orbit.visible = false;
    selectedSatellite.line.visible = false;
  }

  selectedSatellite = satellite;
  satellite.mesh.material.color.setHex(0xff0000);
  satellite.orbit.visible = true;
  satellite.line.visible = true;

  displaySatelliteInfo(satellite);
}

function handleMouseClick(event) {
  // Calculate normalized device coordinates for mouse click
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Set up raycaster to detect objects in 3D space
  raycaster.setFromCamera(mouse, camera);

  // Check if the raycaster intersects with any satellite meshes
  const intersects = raycaster.intersectObjects(satellites.map(sat => sat.mesh));

  // Only change selection if a satellite is clicked
  if (intersects.length > 0) {
    const selectedObject = intersects[0].object;
    const satelliteObject = satellites.find(sat => sat.mesh === selectedObject);

    if (satelliteObject && satelliteObject !== selectedSatellite) {
      // Unselect the previously selected satellite
      if (selectedSatellite) {
        selectedSatellite.mesh.material.color.setHex(0xffffff);  // Reset color of the previous satellite
        selectedSatellite.orbit.visible = false;
        selectedSatellite.line.visible = false;
      }

      // Set the newly clicked satellite as selected
      selectedSatellite = satelliteObject;
      satelliteObject.mesh.material.color.setHex(0xff0000);  // Highlight the selected satellite
      satelliteObject.orbit.visible = true;
      satelliteObject.line.visible = true;

      displaySatelliteInfo(satelliteObject);  // Update the info panel with satellite data
    }
  }
}

function handleTouchStart(event) {
  // Prevent default behavior (like zooming or scrolling)
  event.preventDefault();

  // Get the first touch point
  const touch = event.touches[0];

  // Convert touch coordinates to normalized device coordinates (NDC)
  mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

  // Set up raycaster to detect objects in 3D space
  raycaster.setFromCamera(mouse, camera);

  // Check if the raycaster intersects with any satellite meshes
  const intersects = raycaster.intersectObjects(satellites.map(sat => sat.mesh));

  if (intersects.length > 0) {
    const selectedObject = intersects[0].object;
    const satelliteObject = satellites.find(sat => sat.mesh === selectedObject);

    if (satelliteObject && satelliteObject !== selectedSatellite) {
      // Unselect the previous satellite, if any
      if (selectedSatellite) {
        selectedSatellite.mesh.material.color.setHex(0xffffff);  // Reset color of the previous satellite
        selectedSatellite.orbit.visible = false;
        selectedSatellite.line.visible = false;
      }

      // Set the newly touched satellite as selected
      selectedSatellite = satelliteObject;
      satelliteObject.mesh.material.color.setHex(0xff0000);  // Highlight the selected satellite
      satelliteObject.orbit.visible = true;
      satelliteObject.line.visible = true;

      displaySatelliteInfo(satelliteObject);  // Update the info panel with satellite data
    }
  }

  // Note: Do not unselect the satellite if touching elsewhere on the screen
}
