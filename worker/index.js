import md5 from 'md5';

// Cloudflare Worker entry (deployed via `wrangler deploy` / Workers Builds).
//
// The static app (built into `app/www` by `npm run build:pwa`) is served by Workers
// static assets — requests that match an asset never reach this code. Only non-asset
// requests arrive here; the lone dynamic route is `/proxy-login` (a port of the Node
// `proxy-login.js` at the repo root).
//
// `/proxy-login` provides automated logins for pre-configured personal media servers,
// using `<SERVER>_USER` / `<SERVER>_PASSWORD` from the Worker's environment (set them
// as secrets in the Cloudflare dashboard). Running on Cloudflare's edge it can only
// reach servers that are publicly accessible (no `localhost`/LAN fallbacks).

export default {
    async fetch(request, env) {
        const {pathname} = new URL(request.url);
        if (pathname === '/proxy-login') {
            if (request.method === 'GET' || request.method === 'POST') {
                return handleProxyLogin(request, env);
            }
            return textResponse('Forbidden', 403);
        }
        // Anything else falls through to the static assets (404 handling included).
        return env.ASSETS.fetch(request);
    },
};

async function handleProxyLogin(request, env) {
    const {searchParams} = new URL(request.url);
    const server = searchParams.get('server') || '';
    const url = searchParams.get('url') || '';
    const SERVER_ID = server.toUpperCase();
    const user = getEnv(env, `${SERVER_ID}_USER`);
    const password = getEnv(env, `${SERVER_ID}_PASSWORD`);
    if (!user || !password) {
        return textResponse('Proxy Authentication Required', 407);
    }
    try {
        switch (server) {
            case 'emby':
            case 'jellyfin': {
                const headers = {};
                const auth = request.headers.get('x-emby-authorization');
                if (auth) {
                    headers['X-Emby-Authorization'] = auth;
                }
                return await simpleLogin(url, {Username: user, Pw: password}, headers);
            }

            case 'navidrome':
                return await simpleLogin(url, {username: user, password});

            default:
                return await subsonicLogin(url, user, password);
        }
    } catch (err) {
        console.error(err);
        return textResponse('Internal server error', 500);
    }
}

async function simpleLogin(url, params, headers = {}) {
    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', ...headers},
            body: JSON.stringify(params),
        });
    } catch (err) {
        console.error(err);
        return textResponse('Host not available', 404);
    }
    const text = await response.text();
    return new Response(text, {
        status: response.ok ? 200 : response.status,
        headers: {'Content-Type': response.headers.get('content-type') || 'application/json'},
    });
}

async function subsonicLogin(url, userName, password) {
    const attempt = async (params, forwardErrors = false) => {
        const credentials = new URLSearchParams({
            u: userName,
            ...params,
            c: 'ampcast',
            f: 'json',
        });
        const response = await fetch(`${url}?${credentials}`, {
            method: 'GET',
            headers: {Accept: 'application/json'},
        });
        if (!response.ok) {
            if (forwardErrors) {
                const text = await response.text();
                return new Response(text, {
                    status: response.status,
                    headers: {
                        'Content-Type': response.headers.get('content-type') || 'text/plain',
                    },
                });
            }
            throw response;
        }
        const json = await response.json();
        const data = json['subsonic-response'];
        if (data.error) {
            if (forwardErrors) {
                return new Response(JSON.stringify(json), {
                    status: response.status,
                    headers: {
                        'Content-Type':
                            response.headers.get('content-type') || 'application/json',
                    },
                });
            }
            throw data.error;
        }
        if (data.version) {
            credentials.set('v', data.version);
        }
        return new Response(
            JSON.stringify({
                ['subsonic-response']: data,
                ['ampcast-response']: {
                    userName,
                    credentials: String(credentials),
                },
            }),
            {status: 200, headers: {'Content-Type': 'application/json'}}
        );
    };

    try {
        // Token-based login (Subsonic API >= 1.13).
        const salt = generateRandomString(12);
        return await attempt({t: md5(password + salt), s: salt, v: '1.13.0'});
    } catch (err) {
        if (err instanceof TypeError) {
            console.error(err);
            return textResponse('Host not available', 404);
        }
        console.error(err);
        console.log('Subsonic login failed. Attempting legacy login...');
        try {
            return await attempt({
                p: `enc:${Array.from(new TextEncoder().encode(password))
                    .map((byte) => byte.toString(16).padStart(2, '0'))
                    .join('')}`,
                v: '1.12.0',
            });
        } catch (err) {
            if (err instanceof TypeError) {
                console.error(err);
                return textResponse('Host not available', 404);
            }
            console.error(err);
            console.log('Subsonic login failed. Attempting simple login...');
            return await attempt({p: password, v: '1.12.0'}, true);
        }
    }
}

function getEnv(env, key) {
    let value = String(env?.[key] || '');
    if (/^".*"$/.test(value)) {
        value = value.slice(1, -1);
    }
    return value.trim();
}

function generateRandomString(length = 21) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function textResponse(message, status) {
    return new Response(message, {
        status,
        headers: {'Content-Type': 'text/plain; charset=utf-8'},
    });
}
