export default defineEventHandler(async (event) => {
  try {
    // Clear the auth token cookie
    setCookie(event, 'auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: -1 // Expire immediately
    });

    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error: any) {
    console.error('Logout error:', error);
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    });
  }
}); 