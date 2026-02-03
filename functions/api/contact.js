export async function onRequestPost(context) {
    const { request, env } = context;

    // Set CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    try {
        // Parse request body
        const body = await request.json();
        const { name, email, message } = body;

        // Validate required fields
        if (!name || !name.trim()) {
            return new Response(
                JSON.stringify({ error: 'Name is required' }),
                { status: 400, headers: corsHeaders }
            );
        }

        if (!email || !email.trim()) {
            return new Response(
                JSON.stringify({ error: 'Email is required' }),
                { status: 400, headers: corsHeaders }
            );
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(
                JSON.stringify({ error: 'Please provide a valid email address' }),
                { status: 400, headers: corsHeaders }
            );
        }

        if (!message || !message.trim()) {
            return new Response(
                JSON.stringify({ error: 'Message is required' }),
                { status: 400, headers: corsHeaders }
            );
        }

        // Insert into D1 database
        const result = await env.DB.prepare(
            'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)'
        ).bind(name.trim(), email.trim(), message.trim()).run();

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Contact submission saved successfully',
                id: result.meta.last_row_id
            }),
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error('Contact form error:', error);

        return new Response(
            JSON.stringify({
                error: 'An error occurred while processing your message. Please try again.'
            }),
            { status: 500, headers: corsHeaders }
        );
    }
}

// Handle OPTIONS preflight requests
export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400'
        }
    });
}
