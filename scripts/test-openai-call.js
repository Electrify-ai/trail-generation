// Wrap the entire code in an async function to allow the use of await and return
(async () => {
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
        return; // This return is now valid because it's inside a function
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
        return; // This return is now valid because it's inside a function
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
        console.log('Generate Trail button clicked.');

        const transportMode = 'walking'; // Replace with user input
        const duration = '0-1'; // Replace with user input
        const difficulty = 'easy'; // Replace with user input

        if (!startingPointCoords) {
            alert('Please select a starting point on the map.');
            return;
        }

        try {
            
            const prompt = `Provide the capital city of queensland, australia.`;
            
            const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 50,
                    temperature: 1.0, // Higher temperature for more randomness
                    top_p: 0.8,
                }),
            });
    
            if (!openAiResponse.ok) {
                throw new Error(`OpenAI API request failed with status ${openAiResponse.status}`);
            }
    
            const dataResponse = await openAiResponse.json();
            if (dataResponse.choices && dataResponse.choices.length > 0) {
                
                console.log('OpenAI response:', dataResponse);

                // Display API output
                trailData = dataResponse;
            } else {
                throw new Error("No quote received from API");
            }
    


        } catch (error) {
            console.error('Error generating trail:', error);
            alert('Failed to generate trail. Please try again.');
        
        
        
        }
    });

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

    function updateSubwayDiagram(waypoints) {
        const subwayDiagram = document.getElementById('subway-diagram');
        subwayDiagram.innerHTML = waypoints.map((waypoint, index) => `
            <div class="waypoint">
                <span>${index + 1}. ${waypoint.name}</span>
            </div>
        `).join('');
    }

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
})(); // Immediately invoke the async function