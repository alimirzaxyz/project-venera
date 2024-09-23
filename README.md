Venera - Space Traffic Management

Venera is a 3D space traffic management visualization tool that allows users to track and interact with satellites orbiting Earth. 
Built using Three.js, satellite.js, and other web technologies, Venera aims to offer a sleek and intuitive interface for 
visualizing satellite orbits and gathering real-time satellite information.

Features

	•	Satellite Tracking: View and track satellites in 3D space using real-time data.
	•	Interactive 3D Visualization: Leverage Three.js for an immersive 3D visualization of Earth and satellite orbits.
	•	Satellite Selection: Click (or tap on mobile) on satellites to view detailed information, such as name, altitude, velocity, and more.
	•	Mobile and Tablet Support: Optimized for mobile and tablet devices, allowing users to interact with the visualization on the go.
	•	Satellite Search: Search for satellites by name using the integrated search feature.
	•	Orbit Path Display: View satellite orbit paths based on their tracking data.

Technologies Used

	•	Three.js: Handles the 3D rendering of Earth and satellites.
	•	satellite.js: Used to propagate satellite orbits using TLE (Two-Line Element) data.
	•	HTML5 & CSS3: The interface is built with responsive HTML and CSS for multi-device compatibility.
	•	JavaScript (ES6 Modules): Core functionality and interactivity are handled through JavaScript.
	•	OrbitControls.js: Provides intuitive 3D controls like orbiting and zooming.

 Usage

	•	Viewing Satellites: Satellites are automatically rendered in orbit around Earth. You can interact with them by clicking (or tapping) on individual satellites to view detailed information.
	•	Searching for Satellites: Use the search bar at the top of the page to search for satellites by name.
	•	Navigating: Use your mouse or touch gestures to orbit around the Earth or zoom in and out. On mobile devices, tapping selects satellites.

Controls:

	•	Desktop:
	•	Click to select a satellite.
	•	Use the scroll wheel to zoom in and out.
	•	Click and drag to orbit around Earth.
	•	Mobile:
	•	Tap to select a satellite.
	•	Pinch to zoom in and out.

Mobile Optimization

The application is not currently optimized for mobile and tablet devices. That is next on the list.

To-Do List:

	•	Mobile and tablet device support and optimization.
 	•	Ability to smoothly support twice the amount of satellites.
	•	Cosmetic fixes (camera angles, satellite camera tracking, satellite perspective sizing, etc.)
	•	Fix issue with orbital paths for GEO satellites.
	•	Debris Tracking: Expand functionality to include space debris tracking.

Attribution

The TLE data used to run Venera was retrieved from https://www.space-track.org.
Certain features and design choices were inspired by https://satellitetracker3d.com.
And of course, ChatGPT, my trusty assistant.

License

This project is licensed under the MIT License.

