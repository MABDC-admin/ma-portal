# Admin Email Invitations

## Goal

Allow an administrator to invite a new portal user by email. The recipient sets
their own password through a single-use, time-limited link before they can
access the portal.

## User Flow

1. An administrator opens User Management and selects Invite User.
2. The administrator supplies the recipient name, email address, and role.
3. The server validates the request, rejects an existing account or pending
   invitation for that email, and creates a 72-hour invitation.
4. The server sends an email from `notifications@mabdc.org` with a link to
   `/accept-invite?token=...` on `PUBLIC_APP_URL`.
5. The recipient opens the link, confirms their name, and chooses a password.
6. The server validates the token and password, creates the user with the
   selected role, marks the invitation as used, and signs the user in.

## Data and Security

- Store only a cryptographic hash of the invitation token in MongoDB.
- Generate invitation tokens with cryptographically secure randomness.
- Expire invitations after 72 hours and reject used or expired tokens.
- Keep the MABDC mail API key exclusively in `MABDC_MAIL_API_KEY` on the
  server. It must not be exposed in client bundles or committed environment
  files.
- Require an authenticated administrator for creating invitations.
- Hash the accepted password with Argon2 before storing it.
- Return generic validation errors to the browser and avoid exposing tokens in
  logs.

## Mail Delivery

The server uses the existing MABDC mail API integration:

- Endpoint: `https://api-mail.mabdc.com/v1/emails`
- Sender: `notifications@mabdc.org`
- Authentication: server-side bearer token from `MABDC_MAIL_API_KEY`

Mail delivery failures are returned to the administrator. An invitation is not
created when the message cannot be queued successfully.

## User Interface

The User Management page gains an Invite User dialog with name, email, and
role fields. It shows field-specific validation, a pending state while sending,
and a success or error message without closing unexpectedly.

The invitation-acceptance page validates the link before showing the password
form. Invalid or expired links show a clear explanation and direct the
recipient to contact an administrator.

## Verification

- Unit tests cover token generation, expiration, single-use behavior, and
  account creation with the invited role.
- UI tests cover opening the invite dialog, validation, and the submitted
  invite request.
- Build and lint checks run before deployment.
- The completed flow is checked in a browser with a test recipient address.
