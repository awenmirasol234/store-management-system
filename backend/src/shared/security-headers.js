export function createSecurityHeadersMiddleware() {
  return function securityHeaders(request, response, next) {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("X-XSS-Protection", "0");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self';"
    );
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    next();
  };
}
