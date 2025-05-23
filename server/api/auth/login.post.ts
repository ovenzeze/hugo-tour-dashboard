export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { email, password } = body;

    if (!email || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email and password are required'
      });
    }

    // Get admin credentials from environment variables
    const adminEmail = process.env.AUTH_ADMIN_EMAIL || 'admin@hugoapp.com';
    const adminPassword = process.env.AUTH_ADMIN_PASSWORD || 'Hugo2024!';

    // Simple password verification
    if (email === adminEmail && password === adminPassword) {
      // Create a simple JWT-like token (in production, use proper JWT)
      const token = Buffer.from(JSON.stringify({
        email: adminEmail,
        name: 'Administrator',
        timestamp: Date.now()
      })).toString('base64');

      // Set httpOnly cookie for security
      setCookie(event, 'auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      return {
        success: true,
        user: {
          id: '1',
          name: 'Administrator',
          email: adminEmail
        },
        token
      };
    } else {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid email or password'
      });
    }
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    });
  }
}); 