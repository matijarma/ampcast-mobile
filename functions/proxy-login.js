import md5 from 'md5';

// Cloudflare Pages Function port of `proxy-login.js` (repo root).
//
// Provides automated ("proxy") logins for pre-configured personal media servers, using
// `<SERVER>_USER` / `<SERVER>_PASSWORD` from the Pages project's environment variables
// (set them as encrypted secrets in the Cloudflare dashboard).
//
// NOTES (differences from the Node server):
// - This runs on Cloudflare's edge, so it can only reach media servers that are
//   accessible from the public internet (no `localhost` / LAN / docker fallbacks).
// - With the standard static (`build:pwa`) deployment the client only calls this
//   endpoint when personal media servers are pre-configured; see DEPLOY-CLOUDFLARE.md.

export function onRequestGet(context) {
    return handleProxyLogin(context);
}

export function onRequestPost(context) {
    return handleProxyLogin(context);
}

async function handleProxyLogin({request, env}) {
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
