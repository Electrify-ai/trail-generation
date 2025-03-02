document.addEventListener('DOMContentLoaded', () => {
    const generateTrailButton = document.getElementById('generate-trail-button');

    generateTrailButton.addEventListener('click', async (event) => {
        event.preventDefault();

        // Get form values
        const transportMode = document.getElementById('transport-mode').value;
        const difficulty = document.getElementById('difficulty').value;
        const duration = document.getElementById('duration').value;

        try {
            // Step 1: Fetch Supabase configuration
            const supabaseConfigResponse = await fetch('/.netlify/functions/fetch-supabase-config');
            if (!supabaseConfigResponse.ok) {
                throw new Error('Failed to fetch Supabase configuration');
            }
            const supabaseConfig = await supabaseConfigResponse.json();
            console.log('Supabase Config:', supabaseConfig);

            // Step 2: Fetch secrets (OpenAI API key and Mapbox access token)
            const secretsResponse = await fetch('/.netlify/functions/fetch-secrets');
            if (!secretsResponse.ok) {
                throw new Error('Failed to fetch secrets');
            }
            const secrets = await secretsResponse.json();
            console.log('Secrets:', secrets);

            // Step 3: Get user's current location
            const position = await getCurrentLocation();
            const { latitude, longitude } = position.coords;
            console.log('User Location:', { latitude, longitude });

            // Step 4: Send request to OpenAI API
            const openaiResponse = await fetch('/.netlify/functions/openai-proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'user',
                            content: `Suggest a tourist attraction near ${latitude}, ${longitude} that is suitable for ${transportMode}, has a ${difficulty} difficulty level, and takes around ${duration} to complete.`,
                        },
                    ],
                }),
            });

            if (!openaiResponse.ok) {
                throw new Error('Failed to fetch data from OpenAI API');
            }

            const openaiData = await openaiResponse.json();
            console.log('OpenAI Response:', openaiData); // Log the response for debugging

            // Step 5: Validate the OpenAI response
            if (!openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
                throw new Error('Invalid response from OpenAI API');
            }

            const trailDetails = openaiData.choices[0].message.content;

            // Step 6: Display the result
            document.getElementById('trail-name').textContent = trailDetails;
            document.getElementById('trail-theme').textContent = 'Tourist Attraction';
            document.getElementById('trail-mode').textContent = transportMode;
            document.getElementById('trail-difficulty').textContent = difficulty;
            document.getElementById('trail-description').textContent = trailDetails;

            // Step 7: Optionally, display the location on a map using Mapbox
            displayMap(latitude, longitude, secrets.mapboxAccessToken);
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