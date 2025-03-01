const fetch = require('node-fetch'); // Import node-fetch

exports.handler = async function (event, context) {
    console.log('Incoming event body:', event.body); // Debugging

    // Parse the incoming request body
    let { coords, mode, duration, difficulty, apiKey } = JSON.parse(event.body || '{}');
    console.log('Parsed body:', { coords, mode, duration, difficulty, apiKey }); // Debugging

    // If coords is a string, parse it into an array
    if (typeof coords === 'string') {
        coords = coords.split(',').map(Number);
    }

    // Validate required fields
    if (!Array.isArray(coords)) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: 'coords must be an array' }),
        };
    }

    if (!mode || !duration || !difficulty || !apiKey) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: 'Missing required fields' }),
        };
    }

    // Construct the prompt for OpenAI
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
        // Call the OpenAI API using node-fetch
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
        console.log('OpenAI response:', responseText); // Debugging

        if (!response.ok) {
            console.error('OpenAI API error:', responseText); // Debugging
            throw new Error(`API request failed: ${response.status} - ${responseText}`);
        }

        const data = JSON.parse(responseText);

        // Validate the OpenAI response
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from OpenAI API');
        }

        const trailData = JSON.parse(data.choices[0].message.content);
        console.log('Parsed trail data:', trailData); // Debugging

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(trailData),
        };
    } catch (error) {
        console.error('Function error:', error); // Debugging
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: error.message }),
        };
    }
};