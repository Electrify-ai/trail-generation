const fetch = require('node-fetch'); // Import node-fetch

exports.handler = async function (event, context) {
    console.log('Incoming event body:', event.body); // Debugging

    // Construct the prompt for OpenAI
    const prompt = `Generate a trail starting at coordinates ${coords.join(', ')} `;

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