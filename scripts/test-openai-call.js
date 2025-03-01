// Wait for the DOM and all scripts to load
window.addEventListener('load', async () => {
    console.log('Page fully loaded. Initializing Supabase...');

    // Fetch Supabase URL and key from Netlify environment variables
    let supabaseUrl, supabaseKey;

    try {
        // Fetch credentials from Netlify Function
        const response = await fetch('/.netlify/functions/fetch-supabase-config');
        if (!response.ok) {
            throw new Error(`Failed to fetch credentials: ${response.status}`);
        }

        const data = await response.json();
        supabaseUrl = data.supabaseUrl;
        supabaseKey = data.supabaseKey;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase credentials.');
        }
    } catch (error) {
        console.error('Error fetching Supabase credentials:', error);
        alert('Could not initialize Supabase. Please try again.');
        return;
    }

    // Initialize Supabase client
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    console.log('Supabase initialized:', supabaseClient);

    // Fetch secrets (OpenAI API key and Mapbox access token) from Netlify function
    let openAiApiKey, mapboxAccessToken;
    try {
        const secretsResponse = await fetch('/.netlify/functions/fetch-secrets');
        if (!secretsResponse.ok) {
            throw new Error(`Failed to fetch secrets: ${secretsResponse.status}`);
        }

        const secretsData = await secretsResponse.json();
        openAiApiKey = secretsData.openAiApiKey;
        mapboxAccessToken = secretsData.mapboxAccessToken;

        if (!openAiApiKey || !mapboxAccessToken) {
            throw new Error('Failed to retrieve secrets from Supabase.');
        }
    } catch (error) {
        console.error('Error fetching secrets:', error);
        alert('Failed to initialize application. Please try again.');
        return;
    }

    // Initialize Mapbox with the fetched access token
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
    });

    // Generate Trail Button
    document.getElementById('generate-trail-button').addEventListener('click', async () => {
        // Get user inputs
        const transportMode = document.getElementById('transport-mode').value;
        const duration = document.getElementById('duration').value;
        const difficulty = document.getElementById('difficulty').value;

        // Check if a starting point has been selected
        if (!startingPointCoords) {
            alert('Please select a starting point on the map.');
            return;
        }

        // Call OpenAI API to generate trail
        try {
            const trailData = await generateTrailWithAI(startingPointCoords, transportMode, duration, difficulty, openAiApiKey);
            if (trailData) {
                displayTrailDetails(trailData);
            }
        } catch (error) {
            console.error('Error generating trail:', error);
            alert('Failed to generate trail. Please try again.');
        }
    });
});

// Function to generate trail with OpenAI
async function generateTrailWithAI(coords, mode, duration, difficulty, apiKey) {
    console.log('Calling OpenAI API...');
    
    const prompt = 'Provide a JSON object with a single field "name" containing the name of a trail.';

    try {
        console.log('Sending request to OpenAI:');
        console.log('Prompt:', prompt);
        console.log('API Key:', apiKey);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
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
        throw error; // Re-throw the error to handle it in the calling function
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