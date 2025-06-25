import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/types';

import type { Bindings, Passkey } from '../types';
import { getOrCreateUser, getUser, getUserPasskeys, getPasskeyById } from '../lib/passkeys';

// Extend the Hono Bindings type to include the variables from wrangler.toml
type AuthBindings = Bindings;

const app = new Hono<{ Bindings: AuthBindings }>();

// Schema for the registration challenge request
const registerChallengeSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
});

app.post('/register/challenge', zValidator('json', registerChallengeSchema), async (c) => {
  if (!c.env.REGISTER_ENABLED) {
    return c.json({ error: `Registration is disabled` }, 400);
  }
  const { username, email } = c.req.valid('json');
  const { RP_NAME } = c.env;
  const exists = await getUser(c.env.DB, username, email);
  if (exists) {
    return c.json({ error: `User exists` }, 400);
  }
  const user = await getOrCreateUser(c.env.DB, username, email);
  const userPasskeys = await getUserPasskeys(c.env.DB, user.id);
  const url = new URL(c.req.url);

  // If have env var RP_ID, read it, or use url.hostname
  const rpID = 'undefined' != typeof c.env.RP_ID && c.env.RP_ID ? c.env.RP_ID : url.hostname;
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userID: new TextEncoder().encode(user.id), // FIX: userID must be a BufferSource
    userName: user.username,
    // Prevent users from re-registering the same authenticator
    excludeCredentials: userPasskeys.map(pk => ({
      id: pk.id,
      type: 'public-key',
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    }
  });

  // Store the challenge against the user's original string ID
  await c.env.KV_SESSIONS.put(`challenge:${options.challenge}`, user.id, { expirationTtl: 300 });

  return c.json(options);
});


app.post('/register/verify', async (c) => {
  // The user's ID is no longer sent from the client
  const { response } = await c.req.json<{ response: RegistrationResponseJSON }>();
  const url = new URL(c.req.url);

  if (!response) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  // The challenge is now used to look up the user ID
  // Extract challenge from clientDataJSON
  const clientDataJSON = response.response.clientDataJSON;
  const clientData = JSON.parse(
    new TextDecoder().decode(
      typeof clientDataJSON === 'string'
        ? Uint8Array.from(atob(clientDataJSON.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
        : new Uint8Array(clientDataJSON)
    )
  );
  const expectedChallenge = clientData.challenge;
  const userId = await c.env.KV_SESSIONS.get(`challenge:${expectedChallenge}`);

  if (!userId) {
    return c.json({ error: 'Challenge expired or not found. Please try again.' }, 400);
  }

  const expectedRPID = 'undefined' != typeof c.env.RP_ID && c.env.RP_ID ? c.env.RP_ID : url.hostname;
  const expectedOrigin = 'undefined' != typeof c.env.ORIGIN && c.env.ORIGIN ? c.env.ORIGIN : url.origin;

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
      requireUserVerification: false,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 400);
  }

  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    const { credentialPublicKey, credentialID, counter } = registrationInfo;

    const newPasskey: Omit<Passkey, 'user_id' | 'created_at'> = {
      id: credentialID,
      pubkey_blob: <any>credentialPublicKey,
      sign_counter: counter,
    };

    // Store the new Passkey in D1, linked to the retrieved userId
    await c.env.DB.prepare(
      'INSERT INTO Passkeys (id, user_id, pubkey_blob, sign_counter, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(newPasskey.id, userId, newPasskey.pubkey_blob, newPasskey.sign_counter, Math.floor(Date.now() / 1000)).run();

    // Clean up the challenge from KV
    await c.env.KV_SESSIONS.delete(`challenge:${expectedChallenge}`);

    // Create a session for the user
    const sessionToken = crypto.randomUUID();
    await c.env.KV_SESSIONS.put(`session:${sessionToken}`, userId, { expirationTtl: 86400 });

    return c.json({ verified: true, token: sessionToken });
  }

  return c.json({ verified: false }, 400);
});

const loginChallengeSchema = z.object({});
app.post('/login/challenge', zValidator('json', loginChallengeSchema), async (c) => {
  const url = new URL(c.req.url);
  const rpID = 'undefined' != typeof c.env.RP_ID && c.env.RP_ID ? c.env.RP_ID : url.hostname;
  const options = await generateAuthenticationOptions({
    rpID: rpID,
    userVerification: 'preferred',
  });

  // Store the challenge so we can verify it on the next step
  await c.env.KV_SESSIONS.put(`challenge:${options.challenge}`, "true", { expirationTtl: 300 });

  return c.json(options);
});


app.post('/login/verify', async (c) => {
  const response = await c.req.json<AuthenticationResponseJSON>();
  const url = new URL(c.req.url);

  if (!response) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  // Extract challenge from clientDataJSON
  const clientDataJSON = response.response.clientDataJSON;
  const clientData = JSON.parse(
    new TextDecoder().decode(
      typeof clientDataJSON === 'string'
        ? Uint8Array.from(atob(clientDataJSON.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
        : new Uint8Array(clientDataJSON)
    )
  );
  const challenge = clientData.challenge;

  const expectedChallenge = await c.env.KV_SESSIONS.get(`challenge:${challenge}`);
  if (!expectedChallenge) {
    return c.json({ error: 'Challenge expired or not found' }, 400);
  }

  const passkey = await getPasskeyById(c.env.DB, response.id);
  if (!passkey) {
    return c.json({ error: 'Credential not registered' }, 400);
  }
  const expectedRPID = 'undefined' != typeof c.env.RP_ID && c.env.RP_ID ? c.env.RP_ID : url.hostname;
  const expectedOrigin = 'undefined' != typeof c.env.ORIGIN && c.env.ORIGIN ? c.env.ORIGIN : url.origin;

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID,
      authenticator: {
        credentialID: passkey.id,
        credentialPublicKey: new Uint8Array(passkey.pubkey_blob),
        counter: passkey.sign_counter,
      },
      requireUserVerification: false,
    });
  } catch (error) {
    console.error(error);
    await c.env.KV_SESSIONS.delete(`challenge:${challenge}`);
  }

  if (verification && verification.verified) {
    const { authenticationInfo } = verification;
    // Update the signature counter to prevent replay attacks
    await c.env.DB.prepare('UPDATE Passkeys SET sign_counter = ? WHERE id = ?')
      .bind(authenticationInfo.newCounter, passkey.id).run();

    // Clean up the challenge from KV
    await c.env.KV_SESSIONS.delete(`challenge:${challenge}`);

    // Create a new session
    const sessionToken = crypto.randomUUID();
    await c.env.KV_SESSIONS.put(`session:${sessionToken}`, passkey.user_id, { expirationTtl: 86400 }); // 1 day

    return c.json({ verified: true, token: sessionToken });
  }

  return c.json({ verified: false }, 400);
});

export default app;
