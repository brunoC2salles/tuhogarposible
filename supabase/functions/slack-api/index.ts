import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlackMessage {
  ts: string;
  text: string;
  user: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
    const SLACK_CHANNEL_ID = Deno.env.get('SLACK_CHANNEL_ID');

    if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
      console.error('[Slack API] Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Slack credentials not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { action, text } = await req.json();
    console.log('[Slack API] Action:', action);

    // GET MESSAGES
    if (action === 'get_messages') {
      const response = await fetch(
        `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      
      if (!data.ok) {
        console.error('[Slack API] Error fetching messages:', data.error);
        throw new Error(data.error);
      }

      const messages: SlackMessage[] = (data.messages || [])
        .reverse()
        .map((msg: any) => ({
          ts: msg.ts,
          text: msg.text || '',
          user: msg.user || 'unknown',
        }));

      return new Response(
        JSON.stringify({ 
          success: true, 
          messages 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // SEND MESSAGE
    if (action === 'send_message') {
      if (!text || !text.trim()) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Message text is required' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: SLACK_CHANNEL_ID,
          text: text.trim(),
        }),
      });

      const data = await response.json();
      
      if (!data.ok) {
        console.error('[Slack API] Error sending message:', data.error);
        throw new Error(data.error);
      }

      console.log('[Slack API] Message sent successfully');
      return new Response(
        JSON.stringify({ 
          success: true, 
          ts: data.ts 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Invalid action
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid action' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[Slack API] Exception:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});