document.addEventListener('DOMContentLoaded', () => {
    const generateTrailButton = document.getElementById('generate-trail-button');

    generateTrailButton.addEventListener('click', async (event) => {
        event.preventDefault();

        // Get form values
        const transportMode = document.getElementById('transport-mode').value;
        const difficulty = document.getElementById('difficulty').value;
        const duration = document.getElementById('duration').value;

        try {
            // Step 1: Fetch API keys from Netlify function
            const apiKeysResponse = await fetch('/.netlify/functions/get-api-key');
            if (!apiKeysResponse.ok) {
                throw new Error('Failed to fetch API keys');
            }
            const apiKeys = await apiKeysResponse.json();
            console.log('API Keys:', apiKeys);

            // Step 2: Get user's current location
            const position = await getCurrentLocation();
            const { latitude, longitude } = position.coords;
            console.log('User Location:', { latitude, longitude });

            // Step 3: Construct the prompt for OpenAI
            const prompt = `Generate a trail starting at coordinates ${latitude}, ${longitude} with the following criteria:
- Mode of transport: ${transportMode}
- Duration: ${duration}
- Difficulty: ${difficulty}

Provide the trail details in JSON format with the following fields:
- name: The name of the trail
- theme: The theme of the trail
- mode: The mode of transport
- distance: The distance of the trail
- difficulty: The difficulty level
- description: A description of the trail
- waypoints: An array of waypoints, each with a name and coordinates (coordinates must be an array of two numbers, e.g., [-27.4370558, 153.00084999999999])`;

            // Step 4: Send request to OpenAI API directly
            const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKeys.openAiApiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 200,
                    temperature: 0.7,
                    response_format: { type: 'json_object' },
                }),
            });

            if (!openaiResponse.ok) {
                const errorData = await openaiResponse.json();
                console.error('OpenAI API Error:', errorData);
                throw new Error('Failed to fetch data from OpenAI API');
            }

            const openaiData = await openaiResponse.json();
            console.log('OpenAI Response:', openaiData); // Log the response for debugging

            // Step 5: Validate the OpenAI response
            if (!openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
                throw new Error('Invalid response from OpenAI API');
            }

            // Step 6: Parse the JSON content from the OpenAI response
            let trailData;
            try {
                trailData = JSON.parse(openaiData.choices[0].message.content);
                console.log('Parsed Trail Data:', trailData); // Log the parsed trail data
            } catch (parseError) {
                console.error('Failed to parse OpenAI response:', parseError);
                console.error('Raw OpenAI response content:', openaiData.choices[0].message.content);
                throw new Error('Failed to parse trail data. The response may be malformed.');
            }

            // Step 7: Validate and sanitize the trail data
            if (!trailData.name || !trailData.theme || !trailData.mode || !trailData.distance || !trailData.difficulty || !trailData.description) {
                throw new Error('Invalid trail data format');
            }

            // Step 8: Sanitize waypoints (if available)
            if (trailData.waypoints && Array.isArray(trailData.waypoints)) {
                trailData.waypoints = trailData.waypoints.map(waypoint => {
                    if (typeof waypoint.coordinates === 'string') {
                        // Convert coordinates string to an array of numbers
                        waypoint.coordinates = waypoint.coordinates
                            .split(',')
                            .map(coord => parseFloat(coord.trim()));
                    }
                    return waypoint;
                });
            }

            // Step 9: Display the result
            document.getElementById('trail-name').textContent = trailData.name;
            document.getElementById('trail-theme').textContent = trailData.theme;
            document.getElementById('trail-mode').textContent = trailData.mode;
            document.getElementById('trail-distance').textContent = trailData.distance;
            document.getElementById('trail-difficulty').textContent = trailData.difficulty;
            document.getElementById('trail-description').textContent = trailData.description;

            // Step 10: Optionally, display the location on a map using Mapbox
            displayMap(latitude, longitude, apiKeys.mapboxAccessToken);

            // Step 11: Display waypoints (if available)
            if (trailData.waypoints && Array.isArray(trailData.waypoints)) {
                const waypointsList = document.createElement('ul');
                trailData.waypoints.forEach(waypoint => {
                    const waypointItem = document.createElement('li');
                    waypointItem.textContent = `${waypoint.name} (${waypoint.coordinates.join(', ')})`;
                    waypointsList.appendChild(waypointItem);
                });
                document.getElementById('trail-waypoints').appendChild(waypointsList);
            }
        } catch (error) {
            console.error('Error generating trail:', error);
            alert('Failed to generate trail. Please try again.');
        }
    });
});

// Helper function to get the user's current location
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        } else {
            reject(new Error('Geolocation is not supported by this browser.'));
        }
    });
}

// Helper function to display the location on a map using Mapbox
function displayMap(latitude, longitude, mapboxAccessToken) {
    mapboxgl.accessToken = mapboxAccessToken;
    const map = new mapboxgl.Map({
        container: 'trail-map-view',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [longitude, latitude],
        zoom: 12,
    });

    new mapboxgl.Marker().setLngLat([longitude, latitude]).addTo(map);
}