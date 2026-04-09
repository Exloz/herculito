add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), serial=(), usb=()" always;
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'; script-src 'self' https://clerk.herculito.exloz.site https://*.clerk.accounts.dev https://*.clerk.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https://media.musclewiki.com; frame-src 'self' https://clerk.herculito.exloz.site https://*.clerk.accounts.dev https://*.clerk.com; connect-src 'self' https://api.herculito.exloz.site https://clerk.herculito.exloz.site https://*.clerk.accounts.dev https://*.clerk.com; worker-src 'self' blob:; manifest-src 'self'" always;
