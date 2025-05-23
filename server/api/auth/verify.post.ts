export default defineEventHandler(async (event) => {
  try {
    // Try to get token from cookie first, then from body
    let token = getCookie(event, 'auth-token');
    
    if (!token) {
      const body = await readBody(event);
      token = body.token;
    }

    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'No token provided'
      });
    }

    try {
      // Decode the base64 token
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Check if token is expired (7 days)
      const now = Date.now();
      const tokenAge = now - decoded.timestamp;
      const maxAge = 60 * 60 * 24 * 7 * 1000; // 7 days in milliseconds
      
      if (tokenAge > maxAge) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Token expired'
        });
      }

      // Verify the email matches admin email
      const adminEmail = process.env.AUTH_ADMIN_EMAIL || 'admin@hugoapp.com';
      
      if (decoded.email !== adminEmail) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Invalid token'
        });
      }

      return {
        success: true,
        user: {
          id: '1',
          name: 'Administrator',
          email: decoded.email
        },
        valid: true
      };
    } catch (decodeError) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token format'
      });
    }
  } catch (error: any) {
    console.error('Token verification error:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    });
  }
}); 