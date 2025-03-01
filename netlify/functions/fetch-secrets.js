// fetch-secrets.js
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch'); // Add node-fetch

exports.handler = async function (event, context) {
    // Parse the incoming request body to get Supabase credentials
    const { supabaseUrl, supabaseKey } = JSON.parse(event.body || '{}');

    // Initialize Supabase client with the provided credentials
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Fetch OpenAI API key
        const { data: openAiData, error: openAiError } = await supabase
            .from('secrets')
            .select('value')
            .eq('name', 'openai_api_key')
            .single();

        if (openAiError) throw openAiError;

        // Fetch Mapbox access token
        const { data: mapboxData, error: mapboxError } = await supabase
            .from('secrets')
            .select('value')
            .eq('name', 'mapbox_access_token')
            .single();

        if (mapboxError) throw mapboxError;

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*', // Adjust if needed for security
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                openAiApiKey: openAiData.value,
                mapboxAccessToken: mapboxData.value,
            }),
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