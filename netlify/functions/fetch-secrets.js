// fetch-secrets.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (event, context) {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
                'Access-Control-Allow-Origin': '*', // Allow all origins (adjust for production)
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
                'Access-Control-Allow-Origin': '*', // Allow all origins (adjust for production)
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: error.message }),
        };
    }
};