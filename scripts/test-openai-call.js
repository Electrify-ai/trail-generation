document.getElementById('generate-trail-button').addEventListener('click', async () => {
    console.log('Generate Trail button clicked.');

    const transportMode = 'walking'; // Replace with user input
    const duration = '0-1'; // Replace with user input
    const difficulty = 'easy'; // Replace with user input
    const startingPointCoords = [153.01725985443449, -27.44093021928935]; // Replace with user input

    try {
        const trailData = await generateTrailWithAI(startingPointCoords, transportMode, duration, difficulty);
        if (trailData) {
            displayTrailDetails(trailData);
        }
    } catch (error) {
        console.error('Error generating trail:', error);
        alert('Failed to generate trail. Please try again.');
    }
});

async function generateTrailWithAI(coords, mode, duration, difficulty) {
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