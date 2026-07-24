import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import App from './App.jsx'
import './index.css'

// Cognito OIDC configuration — values populated from .env
const cognitoAuthConfig = {
  authority: import.meta.env.VITE_COGNITO_AUTHORITY,
  client_id: import.meta.env.VITE_COGNITO_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_COGNITO_REDIRECT_URI || window.location.origin,
  response_type: 'code',
  scope: 'phone openid email',
  // Automatically refresh tokens in the background
  automaticSilentRenew: true,
  // On sign-out, redirect to the home page
  post_logout_redirect_uri: import.meta.env.VITE_COGNITO_REDIRECT_URI || window.location.origin,
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
