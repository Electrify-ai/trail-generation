const fetch = require('node-fetch');

exports.handler = async function (event, context) {
    // Parse the incoming request body
    const { coords, mode, duration, difficulty, apiKey } = JSON.parse(event.body || '{}');

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
        // Call the OpenAI API
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

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} - ${responseText}`);
        }

        const data = JSON.parse(responseText);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*', // Adjust if needed for security
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*', // Adjust if needed for security
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: error.message }),
        };
    }
};