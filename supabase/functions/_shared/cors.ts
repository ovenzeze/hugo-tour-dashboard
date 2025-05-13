// Standard CORS headers for Supabase Functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow requests from any origin (adjust for production)
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', // Common headers
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE', // Allowed methods
};