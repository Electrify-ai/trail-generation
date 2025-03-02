// /.netlify/functions/get-api-key.mjs
import { createClient } from '@supabase/supabase-js';

// Log environment variables for debugging
console.log("Supabase URL:", process.env.SUPABASE_DATABASE_URL);
console.log("Supabase Service Role Key:", process.env.SUPABASE_SERVICE_ROLE_KEY);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Netlify function handler
export async function handler(event, context) {
    try {
        console.log("Fetching API keys from Supabase...");

        // Fetch the OpenAI API key from Supabase
        const { data: openAiData, error: openAiError } = await supabase
            .from('secrets')
            .select('value')
            .eq('name', 'openai_api_key')
            .single();

        if (openAiError) {
            console.error("Supabase error (OpenAI):", openAiError);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Failed to fetch OpenAI API key" }),
            };
        }

        // Fetch the Mapbox access token from Supabase
        const { data: mapboxData, error: mapboxError } = await supabase
            .from('secrets')
            .select('value')
            .eq('name', 'mapbox_access_token')
            .single();

        if (mapboxError) {
            console.error("Supabase error (Mapbox):", mapboxError);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Failed to fetch Mapbox access token" }),
            };
        }

        if (!openAiData || !mapboxData) {
            console.error("No data found in Supabase");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "No API keys found" }),
            };
        }

        console.log("API keys fetched successfully:", {
            openAiApiKey: openAiData.value,
            mapboxAccessToken: mapboxData.value,
        });

        // Return the API keys
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
        console.error("Unexpected error:", error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow all origins (adjust for production)
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: error.message }),
        };
    }
}
