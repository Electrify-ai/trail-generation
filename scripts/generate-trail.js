// Function to fetch Supabase credentials
async function fetchSupabaseConfig() {
    try {
        const response = await fetch('/.netlify/functions/fetch-supabase-config');
        if (!response.ok) {
            throw new Error(`Failed to fetch credentials: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching Supabase credentials:', error);
        alert('Could not initialize Supabase. Please try again.');
        throw error;
    }
}

// Function to fetch secrets (OpenAI API key and Mapbox access token)
async function fetchSecrets() {
    try {
        const response = await fetch('/.netlify/functions/fetch-secrets');
        if (!response.ok) {
            throw new Error(`Failed to fetch secrets: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching secrets:', error);
        alert('Failed to initialize application. Please try again.');
        throw error;
    }
}

// Function to initialize Mapbox and handle starting point selection
function initializeMapbox(mapboxAccessToken) {
    mapboxgl.accessToken = mapboxAccessToken;
    const map = new mapboxgl.Map({
        container: 'map-view',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [153.0260, -27.4705], // Brisbane, Australia coordinates
        zoom: 12, // Adjust zoom level as needed
    });

    let startingPointCoords = null;

    // Add map click event to set starting point
    map.on('click', (e) => {
        startingPointCoords = [e.lngLat.lng, e.lngLat.lat];
        document.getElementById('starting-point-coords').value = startingPointCoords;
        new mapboxgl.Marker().setLngLat(startingPointCoords).addTo(map);
        console.log('Starting point selected:', startingPointCoords); // Log the selected coordinates
    });

    return { map, startingPointCoords };
}

// Function to generate trail with OpenAI
async function generateTrailWithAI(coords, mode, duration, difficulty, apiKey) {
    console.log('Calling OpenAI API via proxy...');

    const prompt = `Generate a trail starting at coordinates ${coords.join(', ')} with the following criteria:
- Mode of transport: ${mode}
- Duration: ${duration}
- Difficulty: ${difficulty}

Provide the trail details in JSON format with the following fields:
- name: The name of the trail
- theme: The theme of the trail
- mode: The mode of transport
- distance: The distance of the trail
- difficulty: The difficulty level
- description: A description of the trail
- waypoints: An array of waypoints, each with a name and coordinates`;

    try {
        const response = await fetch('/.netlify/functions/openai-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.7,
                response_format: { type: 'json_object' },
            }),
        });

        const responseText = await response.text();
        console.log('OpenAI response:', responseText);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} - ${responseText}`);
        }

        const data = JSON.parse(responseText);
        console.log('Parsed data:', data);

        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Function to display trail details
function displayTrailDetails(trailData) {
    console.log('Displaying trail details:', trailData);

    // Update the DOM with trail details
    document.getElementById('trail-name').textContent = trailData.name || 'Unnamed Trail';
    document.getElementById('trail-theme').textContent = trailData.theme || 'No theme provided';
    document.getElementById('trail-mode').textContent = trailData.mode || 'No mode provided';
    document.getElementById('trail-distance').textContent = trailData.distance || 'No distance provided';
    document.getElementById('trail-difficulty').textContent = trailData.difficulty || 'No difficulty provided';
    document.getElementById('trail-description').textContent = trailData.description || 'No description provided';

    // Update the subway diagram and map (if waypoints are provided)
    if (trailData.waypoints) {
        updateSubwayDiagram(trailData.waypoints);
        updateMapLine(trailData.waypoints);
    } else {
        console.log('No waypoints to display.');
    }
}

// Function to update subway diagram
function updateSubwayDiagram(waypoints) {
    const subwayDiagram = document.getElementById('subway-diagram');
    subwayDiagram.innerHTML = waypoints.map((waypoint, index) => `
        <div class="waypoint">
            <span>${index + 1}. ${waypoint.name}</span>
        </div>
    `).join('');
}

// Function to update map with trail line
function updateMapLine(waypoints) {
    const coordinates = waypoints.map(waypoint => waypoint.coordinates);
    const trailMap = new mapboxgl.Map({
        container: 'trail-map-view',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: coordinates[0],
        zoom: 12,
    });

    trailMap.on('load', () => {
        trailMap.addLayer({
            id: 'trail-line',
            type: 'line',
            source: {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates,
                    },
                },
            },
            layout: {
                'line-join': 'round',
                'line-cap': 'round',
            },
            paint: {
                'line-color': '#3887be',
                'line-width': 5,
            },
        });
    });
}

// Main initialization function
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Page fully loaded. Initializing application...');

    try {
        // Fetch Supabase credentials
        const { supabaseUrl, supabaseKey } = await fetchSupabaseConfig();
        const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
        console.log('Supabase initialized:', supabaseClient);

        // Fetch secrets (OpenAI API key and Mapbox access token)
        const { openAiApiKey, mapboxAccessToken } = await fetchSecrets();

        // Initialize Mapbox and get the map instance
        const { map, startingPointCoords } = initializeMapbox(mapboxAccessToken);

        // Generate Trail Button
        document.getElementById('generate-trail-button').addEventListener('click', async () => {
            console.log('Generate Trail button clicked.');

            // Get user inputs
            const transportMode = document.getElementById('transport-mode').value;
            const duration = document.getElementById('duration').value;
            const difficulty = document.getElementById('difficulty').value;

            // Get the current starting point coordinates from the hidden input
            const startingPointCoords = document.getElementById('starting-point-coords').value;

            // Check if a starting point has been selected
            if (!startingPointCoords) {
                alert('Please select a starting point on the map.');
                return;
            }

            // Parse the starting point coordinates
            const coords = startingPointCoords.split(',').map(Number);

            try {
                // Call OpenAI API to generate trail
                const trailData = await generateTrailWithAI(coords, transportMode, duration, difficulty, openAiApiKey);
                if (trailData) {
                    displayTrailDetails(trailData);
                }
            } catch (error) {
                console.error('Error generating trail:', error);
                alert('Failed to generate trail. Please try again.');
            }
        });
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Failed to initialize application. Please try again.');
    }
});