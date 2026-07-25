import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import App from './App.jsx'
import './index.css'

const region    = 'ap-south-1'
const poolId    = import.meta.env.VITE_COGNITO_USER_POOL_ID   || 'ap-south-1_8YxI7hQzE'
const clientId  = import.meta.env.VITE_COGNITO_CLIENT_ID      || '43a2pp0o9hiqni139ts5cnglru'
const domain    = import.meta.env.VITE_COGNITO_DOMAIN         || 'prism-auth-098139608966'
const redirectUri = import.meta.env.VITE_COGNITO_REDIRECT_URI || window.location.origin

// Cognito Hosted UI base URL
const cognitoDomain = `https://${domain}.auth.${region}.amazoncognito.com`

const cognitoAuthConfig = {
  // authority = the User Pool issuer (for OIDC discovery / token validation)
  authority: `https://cognito-idp.${region}.amazonaws.com/${poolId}`,
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'openid email phone',

  // Point react-oidc-context at the Hosted UI endpoints explicitly
  // so it uses the Hosted UI login page, not a generic OIDC one
  metadataSeed: {
    authorization_endpoint: `${cognitoDomain}/oauth2/authorize`,
    token_endpoint:         `${cognitoDomain}/oauth2/token`,
    end_session_endpoint:   `${cognitoDomain}/logout`,
    userinfo_endpoint:      `${cognitoDomain}/oauth2/userInfo`,
  },

  // PKCE is default in oidc-client-ts v3 — Cognito supports it
  // but the app client must have AllowedOAuthFlowsUserPoolClient: true
  automaticSilentRenew: true,
  post_logout_redirect_uri: redirectUri,
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
