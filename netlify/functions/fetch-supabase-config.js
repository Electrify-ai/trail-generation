exports.handler = async () => {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*', // Adjust if needed for security
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            supabaseUrl: process.env.SUPABASE_DATABASE_URL,
            supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
        })
    };
};
