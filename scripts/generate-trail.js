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
        const transportMode = document.getElementById('transport-mode').value;
        const duration = document.getElementById('duration').value;
        const difficulty = document.getElementById('difficulty').value;

        if (!startingPointCoords) {
            alert('Please select a starting point on the map.');
            return;
        }

        // Call OpenAI API to generate trail
        const trailData = await generateTrailWithAI(startingPointCoords, transportMode, duration, difficulty, openAiApiKey);
        if (trailData) {
            displayTrailDetails(trailData);
        }
    });

    // Function to generate trail with OpenAI
    async function generateTrailWithAI(coords, mode, duration, difficulty, apiKey) {
        console.log('Calling OpenAI API...');
    
        // Construct the prompt for OpenAI
        const prompt = `Generate a trail starting at coordinates ${coords.join(', ')} with the following criteria:
    - Mode of transport: ${mode}
    - Duration: ${duration}
    - Difficulty: ${difficulty}`;
    
//    Provide the trail details in JSON format with the following fields:
//    - name: The name of the trail
//    - theme: The theme of the trail
//    - mode: The mode of transport
//    - distance: The distance of the trail
//    - difficulty: The difficulty level
//    - description: A description of the trail
//    - waypoints: An array of waypoints, each with a name and coordinates`;
    
        try {
            console.log('Sending request to OpenAI:');
            console.log('Prompt:', prompt);
    
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo', // Use 'gpt-3.5-turbo' for compatibility
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 200, // Increase max_tokens for longer responses
                    temperature: 0.7, // Adjust temperature for creativity
                    response_format: { type: 'json_object' }, // Ensure JSON response
                }),
            });
    
            console.log('OpenAI response status:', response.status);
    
            // Log the raw response text for debugging
            const responseText = await response.text();
            console.log('OpenAI response text:', responseText);
    
            if (!response.ok) {
                throw new Error(`OpenAI API request failed: ${response.status} - ${responseText}`);
            }
    
            // Parse the response text as JSON
            const data = JSON.parse(responseText);
            console.log('Data retrieved from OpenAI:', data);
    
            if (!data.choices || data.choices.length === 0) {
                throw new Error('No choices in OpenAI response');
            }
    
            // Parse the JSON content from the response
            const trailData = JSON.parse(data.choices[0].message.content);
            if (!trailData || !trailData.name) {
                throw new Error('Invalid trail data received');
            }
    
            return trailData;
        } catch (error) {
            console.error('Error fetching data from OpenAI:', error);
            alert('An error occurred while fetching data. Please check the console for details.');
            return null;
        }
    }

    // Function to display trail details
    function displayTrailDetails(trailData) {
        // Panel 1: Trail Details
        document.getElementById('trail-name').textContent = trailData.name || 'Unnamed Trail';
        document.getElementById('trail-theme').textContent = trailData.theme || 'No theme provided';
        document.getElementById('trail-mode').textContent = trailData.mode || 'No mode provided';
        document.getElementById('trail-distance').textContent = trailData.distance || 'No distance provided';
        document.getElementById('trail-difficulty').textContent = trailData.difficulty || 'No difficulty provided';
        document.getElementById('trail-description').textContent = trailData.description || 'No description provided';

        // Panel 2: Subway Diagram
        if (trailData.waypoints) {
            updateSubwayDiagram(trailData.waypoints);
        } else {
            document.getElementById('subway-diagram').innerHTML = 'No waypoints provided.';
        }

        // Panel 3: Map View
        if (trailData.waypoints) {
            updateMapLine(trailData.waypoints);
        } else {
            console.log('No waypoints to display on the map.');
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
});